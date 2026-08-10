/**
 * 기상청 단기예보 순수 로직 (Task 016).
 *
 * 프레임워크(next/cache)·환경변수·네트워크 의존이 없는 순수 함수만 모은다.
 * → 발표시각 산출·정규화를 프레임워크 밖에서 단위 검증할 수 있다.
 * 캐싱·네트워크 오케스트레이션은 `kma-forecast.ts` 가 담당한다.
 */

import type {
  DailyForecast,
  HourlyForecast,
  PartialResult,
  WeatherForecast,
  WeatherSnapshot,
} from "@/lib/types";
import { PTY_CODE_MAP, SKY_CODE_MAP } from "@/lib/types";
import { apiError } from "./errors";

/** 단기예보 발표 시각(KST, 정시). 발표 후 약 10분 뒤부터 조회 가능. */
export const BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23] as const;
/** 발표 시각 이후 조회 가능해지기까지의 안전 여유(분). */
const AVAILABILITY_MARGIN_MIN = 10;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date → YYYYMMDD (전달된 Date 의 UTC 필드 기준). */
function toYmd(d: Date): string {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
}

/**
 * KST(=UTC+9, 고정 오프셋·DST 없음) 벽시계로 환산한 Date.
 * 반환 Date 의 `getUTC*` 값이 곧 한국 현지 연·월·일·시·분이다.
 */
function toKst(now: Date): Date {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

export interface VilageBase {
  /** 발표 일자(KST, YYYYMMDD) */
  baseDate: string;
  /** 발표 시각(HHmm, 정시) */
  baseTime: string;
}

/**
 * "오늘 예보"에 쓸 수 있는 당일 발표 시각(HHmm). 23시 발표는 제외한다.
 *
 * ⚠️ 23:00 발표는 **익일 0000시부터의 예보만** 포함하고 발표 당일 데이터는 없다(실측 확인).
 * 우리 앱은 "오늘"을 보여주므로, 23:10~23:59 에도 23:00 이 아니라 20:00 발표를 써야
 * 오늘 21·22·23시 값을 얻는다. 23:00 발표(익일치)는 자정 경계 롤백에서 소비한다.
 */
const SAME_DAY_BASE_HOURS = BASE_HOURS.filter((h) => h !== 23);

/**
 * 조회 시점 기준으로 "오늘 예보"를 담은 **가장 최근** 단기예보 발표(base_date/base_time)를 구한다.
 * - KST 로 환산 후, `SAME_DAY_BASE_HOURS` 중 (현재시각 ≥ 발표시각+10분)인 최신 슬롯을 선택.
 * - 02:10 이전이면 전날 23:00 발표로 롤백(그 발표가 오늘 0000시부터를 담고 있음, 자정 경계).
 */
export function getVilageBaseDateTime(now: Date = new Date()): VilageBase {
  const kst = toKst(now);
  const hour = kst.getUTCHours();
  const minute = kst.getUTCMinutes();

  for (let i = SAME_DAY_BASE_HOURS.length - 1; i >= 0; i--) {
    const h = SAME_DAY_BASE_HOURS[i];
    const available = hour > h || (hour === h && minute >= AVAILABILITY_MARGIN_MIN);
    if (available) {
      return { baseDate: toYmd(kst), baseTime: `${pad2(h)}00` };
    }
  }

  // 02:10 이전(00:00~02:09) → 전날 23:00 발표(오늘 0000시부터 예보를 담고 있음).
  const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
  return { baseDate: toYmd(prev), baseTime: "2300" };
}

/**
 * "오늘 날씨" 대상 시각(KST HHmm). 현재 시각을 정시로 내려 사용한다.
 * 정규화 시 이 시각에 가장 가까운 예보 슬롯을 고른다.
 */
export function getTargetDateTime(now: Date = new Date()): { date: string; time: string } {
  const kst = toKst(now);
  return { date: toYmd(kst), time: `${pad2(kst.getUTCHours())}00` };
}

// ── 원시 응답 타입(필요한 필드만) ────────────────────────────────────

interface VilageItem {
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
}

export interface VilageResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: VilageItem[] } };
  };
}

/** 카테고리별 (fcstTime → 값) 맵에서 target 시각에 가장 가까운 값을 고른다. */
function pickNearest(byTime: Map<string, string>, targetTime: string): string | undefined {
  if (byTime.has(targetTime)) return byTime.get(targetTime);
  const target = Number(targetTime);
  let best: { diff: number; value: string } | undefined;
  for (const [time, value] of byTime) {
    const diff = Math.abs(Number(time) - target);
    if (!best || diff < best.diff) best = { diff, value };
  }
  return best?.value;
}

/**
 * 단기예보 원시 응답 → `WeatherSnapshot` 정규화.
 * 파싱/필수값 실패 시 throw 하지 않고 `PartialResult.failure` 를 반환한다(부분 실패 격리).
 *
 * @param raw        getVilageFcst 응답
 * @param targetDate 오늘 일자(YYYYMMDD)
 * @param targetTime 대상 시각(HHmm) — 이 시각에 가장 가까운 예보를 채택
 */
export function normalizeVilageForecast(
  raw: unknown,
  targetDate: string,
  targetTime: string,
): PartialResult<WeatherSnapshot> {
  const res = raw as VilageResponse;
  const code = res?.response?.header?.resultCode;
  if (code !== "00") {
    const msg = res?.response?.header?.resultMsg;
    return {
      status: "failure",
      error: apiError("upstream_error", msg ? `기상청 응답 오류: ${msg}` : undefined),
    };
  }

  const items = res?.response?.body?.items?.item;
  if (!Array.isArray(items) || items.length === 0) {
    return {
      status: "failure",
      error: apiError("parse_error", "날씨 예보 데이터가 비어 있습니다."),
    };
  }

  // 오늘(targetDate) 예보만 카테고리별 (시각→값) 으로 정리.
  const byCategory = new Map<string, Map<string, string>>();
  for (const it of items) {
    if (it.fcstDate !== targetDate) continue;
    let m = byCategory.get(it.category);
    if (!m) {
      m = new Map();
      byCategory.set(it.category, m);
    }
    m.set(it.fcstTime, it.fcstValue);
  }

  const get = (category: string): string | undefined => {
    const m = byCategory.get(category);
    return m ? pickNearest(m, targetTime) : undefined;
  };

  const tmp = Number(get("TMP"));
  const pop = Number(get("POP"));
  const wsd = Number(get("WSD"));
  const reh = Number(get("REH"));
  const skyRaw = get("SKY");
  const ptyRaw = get("PTY");

  // 필수 수치가 결측/NaN 이면 표시 신뢰도가 없으므로 실패 처리.
  if ([tmp, pop, wsd, reh].some((v) => Number.isNaN(v))) {
    return {
      status: "failure",
      error: apiError("parse_error", "오늘 예보 시각의 날씨 값을 찾지 못했습니다."),
    };
  }

  // 오늘 최저/최고기온(TMN 0600·TMX 1500). 발표 시각이 지나 값이 없으면 null.
  const tempMinC = parseOptionalNumber(get("TMN"));
  const tempMaxC = parseOptionalNumber(get("TMX"));

  const snapshot: WeatherSnapshot = {
    tempC: tmp,
    feelsLikeC: computeFeelsLike(tmp, wsd, reh),
    tempMinC,
    tempMaxC,
    pop,
    sky: skyRaw ? (SKY_CODE_MAP[skyRaw] ?? "cloudy") : "cloudy",
    pty: ptyRaw ? (PTY_CODE_MAP[ptyRaw] ?? "none") : "none",
    windSpeedMs: wsd,
    humidity: reh,
    baseDate: targetDate,
    baseTime: targetTime,
  };

  return { status: "success", data: snapshot, fetchedAt: new Date().toISOString() };
}

/** 문자열 → 숫자(빈값/NaN 이면 null). TMN/TMX 등 결측 가능 필드용. */
function parseOptionalNumber(v: string | undefined): number | null {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * 체감온도(℃) — 호주 기상청 apparent temperature 공식 (Task 034).
 * AT = Ta + 0.33e − 0.70ws − 4.00, e(수증기압) = (RH/100)·6.105·exp(17.27·Ta/(237.7+Ta)).
 * 기온·습도·풍속만으로 전 계절 단일 공식으로 산출된다(우리가 이미 가진 3값). 소수 1자리 반올림.
 */
export function computeFeelsLike(tempC: number, windMs: number, humidity: number): number {
  const e = (humidity / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  const at = tempC + 0.33 * e - 0.7 * windMs - 4.0;
  return Math.round(at * 10) / 10;
}

/** date+time 을 비교 가능한 숫자(YYYYMMDDHHmm)로. */
function dateTimeKey(date: string, time: string): number {
  return Number(`${date}${time}`);
}

/**
 * 원시 응답 → 일자별(date) → 카테고리(category) → 시각(time) → 값 3중 인덱스.
 * 시간대별/일자별 예보 조립의 공통 전처리. resultCode 검증은 호출부가 이미 수행한다.
 */
function indexItems(items: VilageItem[]): Map<string, Map<string, Map<string, string>>> {
  const byDate = new Map<string, Map<string, Map<string, string>>>();
  for (const it of items) {
    let byCat = byDate.get(it.fcstDate);
    if (!byCat) {
      byCat = new Map();
      byDate.set(it.fcstDate, byCat);
    }
    let byTime = byCat.get(it.category);
    if (!byTime) {
      byTime = new Map();
      byCat.set(it.category, byTime);
    }
    byTime.set(it.fcstTime, it.fcstValue);
  }
  return byDate;
}

/**
 * 시간대별 예보 목록. 대상 시각(fromDate/fromTime) 이후의 TMP 슬롯을 앵커로 삼아
 * 같은 시각의 POP·SKY·PTY 를 묶는다. 가까운 순으로 최대 `limit` 개 반환.
 */
export function buildHourlyForecast(
  items: VilageItem[],
  fromDate: string,
  fromTime: string,
  limit = 12,
): HourlyForecast[] {
  const byDate = indexItems(items);
  const from = dateTimeKey(fromDate, fromTime);
  const out: HourlyForecast[] = [];

  const dates = [...byDate.keys()].sort();
  for (const date of dates) {
    const byCat = byDate.get(date)!;
    const tmpMap = byCat.get("TMP");
    if (!tmpMap) continue;
    const times = [...tmpMap.keys()].sort();
    for (const time of times) {
      if (dateTimeKey(date, time) < from) continue;
      const tempC = Number(tmpMap.get(time));
      if (Number.isNaN(tempC)) continue;
      const popRaw = byCat.get("POP")?.get(time);
      const skyRaw = byCat.get("SKY")?.get(time);
      const ptyRaw = byCat.get("PTY")?.get(time);
      const wsdRaw = byCat.get("WSD")?.get(time);
      out.push({
        date,
        time,
        tempC,
        pop: Number.isNaN(Number(popRaw)) ? 0 : Number(popRaw),
        sky: skyRaw ? (SKY_CODE_MAP[skyRaw] ?? "cloudy") : "cloudy",
        pty: ptyRaw ? (PTY_CODE_MAP[ptyRaw] ?? "none") : "none",
        // WSD 결측 시 0 으로 폴백(풍속 감점 0 → 과대평가 대신 중립).
        windSpeedMs: Number.isNaN(Number(wsdRaw)) ? 0 : Number(wsdRaw),
      });
    }
  }
  return out.slice(0, limit);
}

/**
 * 일자별 예보 목록. 오늘(fromDate)부터 최대 `maxDays` 일. 최저/최고는 TMN/TMX 를
 * 우선 쓰고 없으면 그날 TMP 의 최소/최대로 보정, 강수확률은 그날 최대, 하늘/강수형태는
 * 정오(1200) 근처 슬롯을 대표로 채택한다.
 */
export function buildDailyForecast(
  items: VilageItem[],
  fromDate: string,
  maxDays = 3,
): DailyForecast[] {
  const byDate = indexItems(items);
  const dates = [...byDate.keys()].sort().filter((d) => d >= fromDate);
  const out: DailyForecast[] = [];

  for (const date of dates.slice(0, maxDays)) {
    const byCat = byDate.get(date)!;
    const tmpVals = [...(byCat.get("TMP")?.values() ?? [])]
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    const popVals = [...(byCat.get("POP")?.values() ?? [])]
      .map(Number)
      .filter((n) => !Number.isNaN(n));

    const tmn = parseOptionalNumber(byCat.get("TMN")?.values().next().value);
    const tmx = parseOptionalNumber(byCat.get("TMX")?.values().next().value);
    const tempMinC = tmn ?? (tmpVals.length ? Math.min(...tmpVals) : null);
    const tempMaxC = tmx ?? (tmpVals.length ? Math.max(...tmpVals) : null);

    const skyMap = byCat.get("SKY");
    const ptyMap = byCat.get("PTY");
    const skyRep = skyMap ? pickNearest(skyMap, "1200") : undefined;
    const ptyRep = ptyMap ? pickNearest(ptyMap, "1200") : undefined;

    out.push({
      date,
      tempMinC,
      tempMaxC,
      pop: popVals.length ? Math.max(...popVals) : 0,
      sky: skyRep ? (SKY_CODE_MAP[skyRep] ?? "cloudy") : "cloudy",
      pty: ptyRep ? (PTY_CODE_MAP[ptyRep] ?? "none") : "none",
    });
  }
  return out;
}

/**
 * 단기예보 원시 응답 → 확장 예보(현재 + 시간대별 + 일자별) 정규화.
 * 현재 스냅샷 계산이 실패하면 그 실패를 그대로 전파한다(핵심값 결측 = 표시 불가).
 * 같은 원시 응답 하나로 세 뷰를 만들어 추가 네트워크가 없다.
 */
export function normalizeVilageForecastFull(
  raw: unknown,
  targetDate: string,
  targetTime: string,
): PartialResult<WeatherForecast> {
  const current = normalizeVilageForecast(raw, targetDate, targetTime);
  if (current.status === "failure") return current;

  const items = (raw as VilageResponse)?.response?.body?.items?.item ?? [];
  const hourly = buildHourlyForecast(items, targetDate, targetTime);
  const daily = buildDailyForecast(items, targetDate);

  return {
    status: "success",
    data: { current: current.data, hourly, daily },
    fetchedAt: current.fetchedAt,
  };
}
