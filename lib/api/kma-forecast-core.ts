/**
 * 기상청 단기예보 순수 로직 (Task 016).
 *
 * 프레임워크(next/cache)·환경변수·네트워크 의존이 없는 순수 함수만 모은다.
 * → 발표시각 산출·정규화를 프레임워크 밖에서 단위 검증할 수 있다.
 * 캐싱·네트워크 오케스트레이션은 `kma-forecast.ts` 가 담당한다.
 */

import type { PartialResult, WeatherSnapshot } from "@/lib/types";
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
 * 조회 시점 기준으로 사용 가능한 **가장 최근** 단기예보 발표(base_date/base_time)를 구한다.
 * - KST 로 환산 후, `BASE_HOURS` 중 (현재시각 ≥ 발표시각+10분)인 최신 슬롯을 선택.
 * - 02:10 이전이면 전날 23:00 발표로 롤백(자정 경계).
 */
export function getVilageBaseDateTime(now: Date = new Date()): VilageBase {
  const kst = toKst(now);
  const hour = kst.getUTCHours();
  const minute = kst.getUTCMinutes();

  for (let i = BASE_HOURS.length - 1; i >= 0; i--) {
    const h = BASE_HOURS[i];
    const available = hour > h || (hour === h && minute >= AVAILABILITY_MARGIN_MIN);
    if (available) {
      return { baseDate: toYmd(kst), baseTime: `${pad2(h)}00` };
    }
  }

  // 02:10 이전 → 전날 23:00 발표.
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

  const snapshot: WeatherSnapshot = {
    tempC: tmp,
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
