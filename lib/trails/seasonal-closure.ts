/**
 * 탐방로 계절 통제 판정 (Task 017).
 *
 * 국립공원공단 CSV 의 `통제구간 설명` 은 코스 단위로 다음 3종이다(실측 분포):
 *  - `탐방가능구간`                         → 상시 개방
 *  - `통제구간`                             → 상시 통제(기간 없음)
 *  - `산불방지통제구간(2월 16일~4월 30일)`   → 해당 기간에만 통제, 그 외 개방
 *
 * 라이브 API 호출 없이, 저장된 통제 기간과 **조회일(KST)** 을 비교해 오늘 개방/통제를 계산한다.
 * - 시드 적재 시: `classifyClosure(desc)` 로 status·closed_reason·closed_period 를 산출해 저장.
 * - 조회 시(Route): `resolveTrailStatusOn(stored, now)` 로 오늘 실효 상태를 계산.
 *
 * 순수 함수만 두어(프레임워크·DB 무의존) 경계일 계산을 단위 검증할 수 있다.
 */

import type { TrailStatus } from "@/lib/types";

/** 통제 기간(월/일). 연도 비의존(매년 반복되는 계절 통제). */
export interface SeasonalPeriod {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

/** 저장/조회 공통 통제 표현. trails 테이블의 status·closed_reason·closed_period 에 대응. */
export interface TrailClosure {
  status: TrailStatus;
  closedReason: string | null;
  /** 계절 통제 기간 원문(예: "2월 16일~4월 30일"). 상시/개방이면 null */
  closedPeriod: string | null;
}

/** "M월 D일~M월 D일" 형태에서 기간을 추출. 매칭 실패 시 null. */
const PERIOD_RE = /(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*[~～\-]\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/;

export function parseSeasonalPeriod(text: string | null | undefined): SeasonalPeriod | null {
  if (!text) return null;
  const m = PERIOD_RE.exec(text);
  if (!m) return null;
  return {
    startMonth: Number(m[1]),
    startDay: Number(m[2]),
    endMonth: Number(m[3]),
    endDay: Number(m[4]),
  };
}

/** 월/일을 비교 가능한 서수(MMDD)로. */
function ordinal(month: number, day: number): number {
  return month * 100 + day;
}

/**
 * (월, 일)이 통제 기간 안(경계 포함)인지 판정. 연말↔연초를 감싸는 기간도 지원한다.
 * 산불 통제(봄철)는 감싸지 않지만 일반성을 위해 wrap 케이스를 처리한다.
 */
export function isWithinSeasonalPeriod(
  period: SeasonalPeriod,
  month: number,
  day: number,
): boolean {
  const t = ordinal(month, day);
  const s = ordinal(period.startMonth, period.startDay);
  const e = ordinal(period.endMonth, period.endDay);
  return s <= e ? t >= s && t <= e : t >= s || t <= e;
}

/** Date → KST 기준 월/일(고정 UTC+9, DST 없음). */
export function kstMonthDay(date: Date): { month: number; day: number } {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return { month: kst.getUTCMonth() + 1, day: kst.getUTCDate() };
}

/**
 * CSV `통제구간 설명` → 저장용 통제 표현(시드 적재 시 사용).
 * 계절 통제는 기간 원문만 closed_period 에 담고, status 는 "closed" 로 저장한다
 * (오늘 개방 여부는 조회 시 resolveTrailStatusOn 이 기간과 날짜로 재계산).
 */
export function classifyClosure(desc: string | null | undefined): TrailClosure {
  const d = (desc ?? "").trim();
  if (d === "" || d === "탐방가능구간") {
    return { status: "open", closedReason: null, closedPeriod: null };
  }
  const period = parseSeasonalPeriod(d);
  if (period) {
    // 괄호 안 기간 원문만 추출("산불방지통제구간(2월 16일~4월 30일)" → "2월 16일~4월 30일").
    const inner = d
      .replace(/^[^(]*\(/, "")
      .replace(/\).*$/, "")
      .trim();
    return {
      status: "closed",
      closedReason: "산불방지 기간 통제",
      closedPeriod: inner || d,
    };
  }
  // "통제구간" 등 기간 없는 표기 → 상시 통제.
  return { status: "closed", closedReason: "상시 통제", closedPeriod: null };
}

/**
 * 저장된 통제 표현 + 조회일 → 오늘 실효 상태.
 * - closed_period 없음: 저장 status 그대로(개방 또는 상시 통제).
 * - closed_period 있음(계절 통제): 기간 안이면 통제, 밖이면 개방(사유·기간 표시 제거).
 */
export function resolveTrailStatusOn(stored: TrailClosure, now: Date = new Date()): TrailClosure {
  if (!stored.closedPeriod) {
    return { ...stored };
  }
  const period = parseSeasonalPeriod(stored.closedPeriod);
  if (!period) {
    return { ...stored };
  }
  const { month, day } = kstMonthDay(now);
  if (isWithinSeasonalPeriod(period, month, day)) {
    return {
      status: "closed",
      closedReason: stored.closedReason ?? "산불방지 기간 통제",
      closedPeriod: stored.closedPeriod,
    };
  }
  return { status: "open", closedReason: null, closedPeriod: null };
}
