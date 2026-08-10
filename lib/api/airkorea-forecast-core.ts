/**
 * 에어코리아 대기질 예보통보(getMinuDustFrcstDspth) 순수 로직 (Task 052).
 *
 * 프레임워크(next/cache)·환경변수·네트워크 의존이 없는 순수 함수만 모은다.
 * → 등급 파싱·권역 매핑·발표 슬롯 계산·정규화를 프레임워크 밖에서 단위 검증할 수 있다.
 * 캐싱·네트워크 오케스트레이션은 `airkorea-forecast.ts` 가 담당한다.
 *
 * 응답 구조(라이브 확인 2026-08-10): `response.body.items[]`, 각 원소는
 *   `informCode`(PM10·PM25·O3)·`informData`(예보 대상일 "YYYY-MM-DD")·
 *   `informGrade`("서울 : 좋음,인천 : 좋음,…" 권역:등급 CSV)·`informCause`(발생원인)·
 *   `dataTime`("2026-08-10 11시 발표").
 * 특이점:
 *  - `InformCode` 파라미터를 줘도 PM10/PM25/O3 가 모두 섞여 오므로 코드로 다시 필터한다.
 *  - 같은 예보 대상일에 여러 발표(05·11·17·23시)가 오므로 **가장 최근 발표만** 채택한다.
 *  - 권역 토큰은 시도명과 대체로 같지만 강원=영동/영서, 경기=경기남부/경기북부로 분할된다.
 */

import type { AirGrade, ApiError, DustForecast, DustForecastDay } from "@/lib/types";
import { AIR_GRADE_KOR_MAP, AIR_GRADE_SEVERITY } from "@/lib/types";
import { apiError } from "./errors";

/**
 * 산 마스터 `region` 토큰(광역 시·도) → 예보통보 권역 토큰(들).
 * 산불(SIDO_REGION_CODE)·자외선과 동일한 region 토큰을 쓴다. 강원·경기는 예보권역이
 * 둘로 나뉘므로 배열로 두고, 여러 권역에 걸치면 **최악 등급**을 채택한다(안전 우선).
 */
export const REGION_TO_FORECAST: Record<string, string[]> = {
  서울: ["서울"],
  부산: ["부산"],
  대구: ["대구"],
  인천: ["인천"],
  광주: ["광주"],
  대전: ["대전"],
  울산: ["울산"],
  세종: ["세종"],
  경기: ["경기남부", "경기북부"],
  강원: ["영동", "영서"],
  충북: ["충북"],
  충남: ["충남"],
  전북: ["전북"],
  전남: ["전남"],
  경북: ["경북"],
  경남: ["경남"],
  제주: ["제주"],
};

/** 예보통보 원시 응답 형태(느슨한 파싱용). */
export interface DustForecastResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: unknown[] | null;
      totalCount?: number;
    };
  };
}

/** 특정 (코드·대상일)의 최신 발표 1건에서 뽑아둔 정규화 중간값. */
interface ForecastEntry {
  /** 권역명 → 등급 */
  grades: Record<string, AirGrade>;
  /** 발생원인 요약 */
  cause: string;
  /** 발표시각 라벨 */
  dataTime: string;
  /** 발표 정렬키(클수록 최신) */
  order: number;
}

/** 코어가 반환하는 파싱 결과(권역 선택 전 단계). */
export interface ParsedDustForecast {
  /** key: `${informCode}|${informData}` → 최신 발표 엔트리 */
  byKey: Map<string, ForecastEntry>;
  today: string;
  tomorrow: string;
}

/** KST(=UTC+9) 벽시계 Date. */
function toKst(now: Date): Date {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdOf(kst: Date): string {
  return `${kst.getUTCFullYear()}-${pad2(kst.getUTCMonth() + 1)}-${pad2(kst.getUTCDate())}`;
}

/** KST 기준 오늘·내일 "YYYY-MM-DD" 를 구한다(예보 대상일 필터·API searchDate 용). */
export function getForecastDates(now: Date = new Date()): { today: string; tomorrow: string } {
  const kst = toKst(now);
  const today = ymdOf(kst);
  const kstTomorrow = new Date(kst.getTime() + 24 * 60 * 60 * 1000);
  const tomorrow = ymdOf(kstTomorrow);
  return { today, tomorrow };
}

/** 발표 시각(KST). 하루 4회(05·11·17·23시) → 캐시 슬롯 회전으로 새 발표를 즉시 반영한다. */
const PUBLISH_HOURS = [23, 17, 11, 5] as const;

/**
 * 캐시 슬롯(YYYYMMDD, 발표시각 HH)을 KST 기준으로 구한다. 지금 시각 이하의 최근 발표시각을
 * 고르고, 05시 이전이면 전날 23시 발표로 롤백한다. 새 발표가 나오면 키가 바뀌어 즉시 재조회된다.
 */
export function getDustSlot(now: Date = new Date()): { yyyymmdd: string; slot: string } {
  const kst = toKst(now);
  const hour = kst.getUTCHours();
  const publish = PUBLISH_HOURS.find((h) => hour >= h);
  if (publish === undefined) {
    // 자정~05시: 전날 23시 발표
    const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
    const yyyymmdd = `${prev.getUTCFullYear()}${pad2(prev.getUTCMonth() + 1)}${pad2(prev.getUTCDate())}`;
    return { yyyymmdd, slot: "23" };
  }
  const yyyymmdd = `${kst.getUTCFullYear()}${pad2(kst.getUTCMonth() + 1)}${pad2(kst.getUTCDate())}`;
  return { yyyymmdd, slot: pad2(publish) };
}

/**
 * `informGrade` CSV("서울 : 좋음,인천 : 보통,…") → 권역명→AirGrade 맵.
 * 미매핑 등급 토큰은 건너뛴다(부분 유효).
 */
export function parseGradeString(informGrade: string | undefined): Record<string, AirGrade> {
  const out: Record<string, AirGrade> = {};
  if (typeof informGrade !== "string") return out;
  for (const part of informGrade.split(",")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const region = part.slice(0, idx).trim();
    const gradeKor = part.slice(idx + 1).trim();
    const grade = AIR_GRADE_KOR_MAP[gradeKor];
    if (region && grade) out[region] = grade;
  }
  return out;
}

/**
 * 발표시각 라벨("YYYY-MM-DD HH시 발표") → 정렬키. 파싱 실패 시 0.
 * 같은 (코드·대상일) 중 최신 발표를 고르는 데 쓴다.
 */
export function parseAnnounceOrder(dataTime: string | undefined): number {
  if (typeof dataTime !== "string") return 0;
  const m = dataTime.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2})\s*시/);
  if (!m) return 0;
  const [, y, mo, d, h] = m;
  return Number(`${y}${mo}${d}${pad2(Number(h))}`);
}

/**
 * 원시 응답 → 파싱 결과(권역 선택 전). PM10/PM25 만, 오늘·내일 대상일만, 최신 발표만 남긴다.
 * resultCode≠00 은 failure. 유효 엔트리가 없으면 failure(not_covered).
 */
export function normalizeDustForecast(
  raw: DustForecastResponse,
  now: Date = new Date(),
): { status: "success"; data: ParsedDustForecast } | { status: "failure"; error: ApiError } {
  const header = raw.response?.header;
  if (header?.resultCode && header.resultCode !== "00") {
    return {
      status: "failure",
      error: apiError("upstream_error", `대기질 예보통보 오류(${header.resultCode})`),
    };
  }

  const items = raw.response?.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return {
      status: "failure",
      error: apiError("not_covered", "대기질 예보 데이터가 없습니다."),
    };
  }

  const { today, tomorrow } = getForecastDates(now);
  const targetDates = new Set([today, tomorrow]);
  const byKey = new Map<string, ForecastEntry>();

  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const row = it as Record<string, unknown>;
    const code = typeof row.informCode === "string" ? row.informCode : "";
    if (code !== "PM10" && code !== "PM25") continue;
    const date = typeof row.informData === "string" ? row.informData : "";
    if (!targetDates.has(date)) continue;

    const grades = parseGradeString(typeof row.informGrade === "string" ? row.informGrade : "");
    if (Object.keys(grades).length === 0) continue;

    const dataTime = typeof row.dataTime === "string" ? row.dataTime : "";
    const order = parseAnnounceOrder(dataTime);
    const cause = typeof row.informCause === "string" ? row.informCause : "";
    const key = `${code}|${date}`;

    const prev = byKey.get(key);
    if (!prev || order >= prev.order) {
      byKey.set(key, { grades, cause, dataTime, order });
    }
  }

  if (byKey.size === 0) {
    return {
      status: "failure",
      error: apiError("parse_error", "대기질 예보 응답을 해석할 수 없습니다."),
    };
  }

  return { status: "success", data: { byKey, today, tomorrow } };
}

/** 여러 권역 토큰 중 최악 등급(안전 우선)을 고른다. 해당 권역 데이터가 없으면 null. */
function worstGrade(grades: Record<string, AirGrade>, forecastRegions: string[]): AirGrade | null {
  let picked: AirGrade | null = null;
  for (const region of forecastRegions) {
    const g = grades[region];
    if (!g) continue;
    if (picked === null || AIR_GRADE_SEVERITY[g] > AIR_GRADE_SEVERITY[picked]) picked = g;
  }
  return picked;
}

/** 발생원인 앞머리의 불릿("○ ")·공백을 정리한다. */
function cleanCause(cause: string): string {
  return cause.replace(/^[○◦•\s]+/, "").trim();
}

/**
 * 파싱 결과 + 산의 `region` → `DustForecast`(권역 매핑·최악값 적용).
 * - region 이 예보권역으로 하나도 매핑되지 않으면 null(섹션 미노출).
 * - 오늘·내일 두 칸의 PM10·PM2.5 등급을 채우고, 발생원인은 오늘 PM10(없으면 PM2.5) 기준.
 */
export function dustForecastForRegion(
  parsed: ParsedDustForecast,
  region: string,
): DustForecast | null {
  const tokens = region.split("·").map((t) => t.trim());
  const forecastRegions: string[] = [];
  for (const t of tokens) {
    const mapped = REGION_TO_FORECAST[t];
    if (mapped) forecastRegions.push(...mapped);
  }
  if (forecastRegions.length === 0) return null;
  // 중복 제거(다중 토큰 산에서 같은 권역 중복 방지)
  const uniqueRegions = [...new Set(forecastRegions)];

  const { byKey, today, tomorrow } = parsed;
  const days: DustForecastDay[] = [];
  let cause: string | null = null;
  let announcedAt = "";

  for (const [date, when] of [
    [today, "today"],
    [tomorrow, "tomorrow"],
  ] as const) {
    const pm10 = byKey.get(`PM10|${date}`);
    const pm25 = byKey.get(`PM25|${date}`);
    const pm10Grade = pm10 ? worstGrade(pm10.grades, uniqueRegions) : null;
    const pm25Grade = pm25 ? worstGrade(pm25.grades, uniqueRegions) : null;

    // 두 오염물질 모두 데이터 없는 날은 칸을 만들지 않는다(내일 미발표 등).
    if (pm10Grade === null && pm25Grade === null && !pm10 && !pm25) continue;

    days.push({ date, when, pm10Grade, pm25Grade });

    // 발표시각·발생원인은 오늘 PM10 을 대표로 취하되, 없으면 순차 폴백.
    const rep = pm10 ?? pm25;
    if (rep) {
      if (!announcedAt) announcedAt = rep.dataTime;
      if (cause === null && rep.cause) cause = cleanCause(rep.cause);
    }
  }

  if (days.length === 0) return null;

  return {
    days,
    cause,
    regionName: uniqueRegions.join("·"),
    announcedAt,
  };
}
