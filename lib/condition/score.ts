/**
 * 컨디션 점수 산출 엔진 (Task 023, 결정 003 #10·#11 v1 동결).
 *
 * 순수 함수(부수효과 없음)로, 기준점 100에서 변수별 감점을 빼 0~100 점수를 만든다.
 * **서버에서만 호출**한다(입력 원천이 서버 프록시에만 존재, 결정 003 #10).
 *
 * v1 감점 가중치(동결표):
 *   강수확률 POP  30%→70% 선형     최대 −25
 *   강수형태 PTY  유형별 단계 가산  최대 −10
 *   기온     TMP  쾌적 5~22℃ 이탈폭 선형  최대 −20
 *   풍속     WSD  7→14 m/s 선형     최대 −15
 *   미세먼지 AIR  '나쁨'부터 등급 단계  최대 −20
 *   자외선   UV   6('높음')→11 선형  최대 −10
 *
 * 감점 합계가 100을 넘으면 점수는 0으로 클램프한다. 각 감점은 표시 일관성을 위해
 * 정수로 반올림해 합산하므로, breakdown 의 −값 합과 (100−score) 가 일치한다.
 * 대기질·자외선이 결측이면 해당 변수를 감점 후보에서 제외하고 `excludedVariables` 에 표기한다.
 */

import type {
  AirGrade,
  AirQuality,
  ConditionScore,
  PrecipitationType,
  ScoreBreakdownItem,
  ScoreFactor,
  UvIndex,
  WeatherSnapshot,
} from "@/lib/types";
import { PTY_LABEL, AIR_GRADE_LABEL } from "@/lib/types";
import { scoreToGrade, gradeMessage } from "./grade";

/** 알고리즘 버전 (결정 003 #10). 가중치·구간·보간식·등급 경계 변경 시 증가. */
export const CALC_VERSION = "v1";

// ── v1 동결 상수 (결정 003 #11) ─────────────────────────────────────
const POP_START = 30; // % — 감점 시작
const POP_MAX = 70; // % — 최대 감점 도달
const POP_MAX_PENALTY = 25;

const PTY_MAX_PENALTY = 10;

const TMP_COMFORT_MIN = 5; // ℃
const TMP_COMFORT_MAX = 22; // ℃
const TMP_MAX_DEVIATION = 15; // ℃ — 쾌적대 이탈폭이 이 값이면 최대 감점
const TMP_MAX_PENALTY = 20;

const WSD_START = 7; // m/s
const WSD_MAX = 14; // m/s
const WSD_MAX_PENALTY = 15;

const AIR_MAX_PENALTY = 20;

const UV_START = 6; // '높음' — 감점 시작
const UV_MAX = 11; // '위험' — 최대 감점 도달
const UV_MAX_PENALTY = 10;

/** 선형 보간: [start, max] 구간에서 0→maxPenalty. 구간 밖은 클램프. */
function linearPenalty(value: number, start: number, max: number, maxPenalty: number): number {
  if (value <= start) return 0;
  if (value >= max) return maxPenalty;
  return (maxPenalty * (value - start)) / (max - start);
}

/** 강수형태(PTY) 단계 감점 — 유형별 가산(비/눈/소나기 강, 빗방울/눈날림 약). */
function ptyPenalty(pty: PrecipitationType): number {
  switch (pty) {
    case "none":
      return 0;
    // 약한 강수(빗방울·눈날림 계열)
    case "drizzle":
    case "drizzle-snow":
    case "snow-flurry":
      return PTY_MAX_PENALTY / 2;
    // 본격 강수(비·비눈·눈·소나기)
    case "rain":
    case "rain-snow":
    case "snow":
    case "shower":
      return PTY_MAX_PENALTY;
    default:
      return 0;
  }
}

/** 기온(TMP) 이탈폭 선형 감점 — 쾌적대(5~22℃) 밖으로 벗어난 폭에 비례. */
function tmpPenalty(tempC: number): number {
  const deviation =
    tempC < TMP_COMFORT_MIN
      ? TMP_COMFORT_MIN - tempC
      : tempC > TMP_COMFORT_MAX
        ? tempC - TMP_COMFORT_MAX
        : 0;
  return linearPenalty(deviation, 0, TMP_MAX_DEVIATION, TMP_MAX_PENALTY);
}

/** 미세먼지 등급 단계 감점 — '나쁨'부터. PM10·PM2.5 중 나쁜 등급 채택. */
function airPenalty(grade: AirGrade): number {
  switch (grade) {
    case "unhealthy":
      return AIR_MAX_PENALTY / 2; // 나쁨 −10
    case "very-unhealthy":
      return AIR_MAX_PENALTY; // 매우나쁨 −20
    default:
      return 0; // 좋음·보통
  }
}

/** 두 등급 중 더 나쁜(감점 큰) 쪽을 고른다. null 은 무시. */
function worseAirGrade(a: AirGrade | null, b: AirGrade | null): AirGrade | null {
  const order: Record<AirGrade, number> = {
    good: 0,
    moderate: 1,
    unhealthy: 2,
    "very-unhealthy": 3,
  };
  if (a === null) return b;
  if (b === null) return a;
  return order[a] >= order[b] ? a : b;
}

export interface ScoreInputs {
  /** 필수 — 날씨 스냅샷(없으면 점수 계산 불가) */
  weather: WeatherSnapshot;
  /** 결측 시 null → 감점 후보 제외 */
  air?: AirQuality | null;
  /** 결측 시 null → 감점 후보 제외 */
  uv?: UvIndex | null;
  /** 계산 시각 주입(테스트 결정성). 기본 now. */
  now?: Date;
}

/**
 * 컨디션 점수를 계산한다. 감점 후보를 모아 정수 반올림 후 합산하고, 상위 감점 요인
 * 2~3개를 breakdown 으로 노출한다. 대기질/자외선 결측은 excludedVariables 로 격리한다.
 */
export function computeConditionScore(inputs: ScoreInputs): ConditionScore {
  const { weather, air, uv, now = new Date() } = inputs;

  const candidates: ScoreBreakdownItem[] = [];
  const excludedVariables: ScoreFactor[] = [];

  const push = (factor: ScoreFactor, label: string, rawPenalty: number) => {
    const penalty = Math.round(rawPenalty);
    if (penalty > 0) candidates.push({ factor, label, penalty });
  };

  // 강수확률
  push(
    "pop",
    `강수확률 ${weather.pop}%`,
    linearPenalty(weather.pop, POP_START, POP_MAX, POP_MAX_PENALTY),
  );

  // 강수형태 (없음이면 감점 0 → 후보 제외)
  if (weather.pty !== "none") {
    push("pty", `강수형태 ${PTY_LABEL[weather.pty]}`, ptyPenalty(weather.pty));
  }

  // 기온
  push("temp", `기온 ${Math.round(weather.tempC)}℃`, tmpPenalty(weather.tempC));

  // 풍속
  push(
    "wind",
    `풍속 ${weather.windSpeedMs}m/s`,
    linearPenalty(weather.windSpeedMs, WSD_START, WSD_MAX, WSD_MAX_PENALTY),
  );

  // 미세먼지 (부분 폴백)
  const airGrade = air ? worseAirGrade(air.pm10Grade, air.pm25Grade) : null;
  if (!air || airGrade === null) {
    excludedVariables.push("air");
  } else {
    push("air", `미세먼지 ${AIR_GRADE_LABEL[airGrade]}`, airPenalty(airGrade));
  }

  // 자외선 (부분 폴백)
  if (!uv) {
    excludedVariables.push("uv");
  } else {
    push("uv", `자외선 ${uv.value}`, linearPenalty(uv.value, UV_START, UV_MAX, UV_MAX_PENALTY));
  }

  const totalPenalty = candidates.reduce((sum, c) => sum + c.penalty, 0);
  const score = Math.max(0, 100 - totalPenalty);
  const grade = scoreToGrade(score);

  // 상위 감점 요인 2~3개(감점 큰 순). 근거 노출용.
  const breakdown = [...candidates].sort((a, b) => b.penalty - a.penalty).slice(0, 3);

  return {
    score,
    grade,
    message: gradeMessage(grade),
    breakdown,
    excludedVariables,
    calcVersion: CALC_VERSION,
    computedAt: now.toISOString(),
  };
}
