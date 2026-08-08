/**
 * 기상청 생활기상지수 V5 자외선(getUVIdxV5) 순수 로직 (Task 022, 결정 001 #6).
 *
 * 프레임워크(next/cache)·환경변수·네트워크 의존이 없는 순수 함수만 모은다.
 * → 발표시각 산출·정규화를 프레임워크 밖에서 단위 검증할 수 있다.
 * 캐싱·네트워크 오케스트레이션은 `kma-uv.ts` 가 담당한다.
 *
 * 응답 구조: `items.item[0]` 에 `code`(예보구역)·`areaNo`·`date`(발표시각 YYYYMMDDHH)와
 * **`h0`~`h75`(발표시각 기준 3시간 간격 UV 예보값)**. 값 없는 시간대는 빈 문자열.
 * 발표는 하루 2회(06·18시). "지금" 대상 UV 는 발표시각 + k*3h 슬롯 중 현재 시각에
 * 가장 가까운(비어있지 않은) 값을 채택한다(날씨 스냅샷의 최근접 슬롯 규칙과 동일 철학).
 */

import type { PartialResult, UvGrade, UvIndex } from "@/lib/types";
import { UV_GRADE_THRESHOLDS } from "@/lib/types";
import { apiError } from "./errors";

/** 자외선 발표 시각(KST, 정시). 하루 2회. */
export const UV_BASE_HOURS = [6, 18] as const;
/** 발표 후 조회 가능해지기까지의 안전 여유(분). */
const AVAILABILITY_MARGIN_MIN = 40;
/** 예보 슬롯 간격(시간). h0,h3,... */
const SLOT_STEP_HOURS = 3;
/** 마지막 슬롯 인덱스(h75). */
const MAX_SLOT = 75;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** KST(=UTC+9) 벽시계로 환산한 Date. getUTC* 값이 곧 한국 현지 시각. */
function toKst(now: Date): Date {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

/** KST Date → YYYYMMDDHH */
function toYmdH(kst: Date): string {
  return (
    `${kst.getUTCFullYear()}${pad2(kst.getUTCMonth() + 1)}${pad2(kst.getUTCDate())}` +
    pad2(kst.getUTCHours())
  );
}

export interface UvBase {
  /** 발표 시각(YYYYMMDDHH, KST) */
  baseTime: string;
  /** 발표 시각의 KST Date(슬롯 절대시각 계산용) */
  baseKst: Date;
}

/**
 * 조회 시점 기준 사용 가능한 **가장 최근** 자외선 발표시각(06/18)을 구한다.
 * - 06:40 이전이면 전날 18시, 18:40 이전이면 오늘 06시, 그 외 오늘 18시.
 */
export function getUvBaseTime(now: Date = new Date()): UvBase {
  const kst = toKst(now);
  const hour = kst.getUTCHours();
  const minute = kst.getUTCMinutes();

  const afterMargin = (h: number) => hour > h || (hour === h && minute >= AVAILABILITY_MARGIN_MIN);

  let baseKst: Date;
  if (afterMargin(18)) {
    baseKst = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 18));
  } else if (afterMargin(6)) {
    baseKst = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 6));
  } else {
    // 06:40 이전 → 전날 18시.
    const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
    baseKst = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate(), 18));
  }
  return { baseTime: toYmdH(baseKst), baseKst };
}

/** UV 지수 값 → 등급(구간 하한 포함). */
export function uvGradeFromValue(value: number): UvGrade {
  for (const { min, grade } of UV_GRADE_THRESHOLDS) {
    if (value >= min) return grade;
  }
  return "low";
}

// ── 원시 응답 타입(필요한 필드만) ────────────────────────────────────

interface UvItem {
  code?: string;
  areaNo?: string;
  /** 발표시각 YYYYMMDDHH */
  date?: string;
  /** h0~h75 동적 키 접근 */
  [key: string]: string | undefined;
}

export interface UvResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: UvItem[] } };
  };
}

/**
 * 자외선 원시 응답 → `UvIndex` 정규화.
 * 파싱 실패 시 throw 하지 않고 `PartialResult.failure` 를 반환한다(부분 실패 격리).
 *
 * @param raw      getUVIdxV5 응답
 * @param baseKst  발표시각 KST Date(슬롯 절대시각 계산 기준). 미지정 시 응답 date 로 유추.
 * @param now      현재 시각(최근접 슬롯 선택 기준)
 */
export function normalizeUv(
  raw: unknown,
  baseKst: Date,
  now: Date = new Date(),
): PartialResult<UvIndex> {
  const res = raw as UvResponse;
  const code = res?.response?.header?.resultCode;
  if (code !== undefined && code !== "00") {
    const msg = res?.response?.header?.resultMsg;
    // "99 검색결과 없음" = 해당 지역코드 미커버 → not_covered 로 분기.
    const errCode = code === "99" ? "not_covered" : "upstream_error";
    return {
      status: "failure",
      error: apiError(errCode, msg ? `자외선 조회 오류: ${msg}` : undefined),
    };
  }

  const item = res?.response?.body?.items?.item?.[0];
  if (!item) {
    return {
      status: "failure",
      error: apiError("parse_error", "자외선 데이터가 비어 있습니다."),
    };
  }

  const nowKst = toKst(now);
  const nowMs = nowKst.getTime();

  // h0,h3,...,h75 중 현재 시각에 가장 가까운 비어있지 않은 슬롯을 채택.
  let best: { value: number; slotKst: Date; diff: number } | undefined;
  for (let k = 0; k <= MAX_SLOT; k += SLOT_STEP_HOURS) {
    const raw = item[`h${k}`];
    if (raw === undefined || raw.trim() === "") continue;
    const value = Number(raw.trim());
    if (Number.isNaN(value)) continue;
    const slotKst = new Date(baseKst.getTime() + k * 60 * 60 * 1000);
    const diff = Math.abs(slotKst.getTime() - nowMs);
    if (!best || diff < best.diff) best = { value, slotKst, diff };
  }

  if (!best) {
    return {
      status: "failure",
      error: apiError("parse_error", "유효한 자외선 예보 값을 찾지 못했습니다."),
    };
  }

  const uv: UvIndex = {
    value: best.value,
    grade: uvGradeFromValue(best.value),
    time: toYmdH(best.slotKst),
  };

  return { status: "success", data: uv, fetchedAt: new Date().toISOString() };
}
