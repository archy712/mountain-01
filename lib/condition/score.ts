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
  ScoreFactorAssessment,
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

// ── 요인별 질적 코멘트 ───────────────────────────────────────────────

function tempNote(t: number): string {
  if (t < TMP_COMFORT_MIN) {
    const dev = TMP_COMFORT_MIN - t;
    return dev > 10 ? "강추위 주의" : dev > 5 ? "추워요" : "쌀쌀해요";
  }
  if (t > TMP_COMFORT_MAX) {
    const dev = t - TMP_COMFORT_MAX;
    return dev > 10 ? "폭염 주의" : dev > 5 ? "더워요" : "한낮 다소 높음";
  }
  return "쾌적해요";
}

function precipNote(pop: number, pty: PrecipitationType): string {
  if (pty !== "none") return `${PTY_LABEL[pty]} 예보`;
  if (pop < POP_START) return "걱정 없음";
  if (pop < 60) return "우산을 챙기세요";
  return "비 가능성 높음";
}

function windNote(w: number): string {
  if (w < WSD_START) return "잔잔함";
  if (w < WSD_MAX) return "바람 다소 강함";
  return "강풍 주의";
}

function airNote(air: AirQuality): string {
  const parts: string[] = [];
  if (air.pm10 !== null) parts.push(`PM10 ${air.pm10}`);
  if (air.pm25 !== null) parts.push(`PM2.5 ${air.pm25}`);
  return parts.length > 0 ? parts.join(" · ") : air.stationName;
}

function uvNote(v: number): string {
  if (v < 3) return "낮음";
  if (v < UV_START) return "보통";
  if (v < 8) return "높음";
  if (v < UV_MAX) return "매우 높음";
  return "위험";
}

/**
 * 요인별 종합 평가를 만든다(Task 041 후속, 점수 근거 UI 확장).
 *
 * `computeConditionScore` 와 **동일한 감점 함수·상수**를 재사용해, 좋은 요인(감점 0)까지 포함한
 * 전체 요인 목록을 낸다. 강수확률·강수형태는 사용자 체감상 하나라 '강수' 한 줄로 병합한다
 * (감점은 두 값의 합). 각 행 penalty 는 엔진과 동일하게 정수 반올림하므로, 전 행 합은
 * `100 − score` 와 일치한다. 대기질·자외선 결측은 excluded 로 표시한다.
 */
export function assessConditionFactors(inputs: ScoreInputs): ScoreFactorAssessment[] {
  const { weather, air = null, uv = null } = inputs;
  const rows: ScoreFactorAssessment[] = [];

  const tempP = Math.round(tmpPenalty(weather.tempC));
  rows.push({
    factor: "temp",
    label: "기온",
    valueText: `${Math.round(weather.tempC)}℃`,
    note: tempNote(weather.tempC),
    status: tempP > 0 ? "caution" : "good",
    penalty: tempP,
    maxPenalty: TMP_MAX_PENALTY,
  });

  // 강수확률 + 강수형태 병합('강수').
  const popP = Math.round(linearPenalty(weather.pop, POP_START, POP_MAX, POP_MAX_PENALTY));
  const ptyP = weather.pty !== "none" ? Math.round(ptyPenalty(weather.pty)) : 0;
  const precipP = popP + ptyP;
  rows.push({
    factor: "pop",
    label: "강수",
    valueText: `${weather.pop}%`,
    note: precipNote(weather.pop, weather.pty),
    status: precipP > 0 ? "caution" : "good",
    penalty: precipP,
    maxPenalty: POP_MAX_PENALTY + PTY_MAX_PENALTY,
  });

  const windP = Math.round(linearPenalty(weather.windSpeedMs, WSD_START, WSD_MAX, WSD_MAX_PENALTY));
  rows.push({
    factor: "wind",
    label: "바람",
    valueText: `${weather.windSpeedMs}㎧`,
    note: windNote(weather.windSpeedMs),
    status: windP > 0 ? "caution" : "good",
    penalty: windP,
    maxPenalty: WSD_MAX_PENALTY,
  });

  const airGrade = air ? worseAirGrade(air.pm10Grade, air.pm25Grade) : null;
  if (!air || airGrade === null) {
    rows.push({
      factor: "air",
      label: "미세먼지",
      valueText: "정보 없음",
      note: "인근 측정소 없음",
      status: "excluded",
      penalty: 0,
      maxPenalty: AIR_MAX_PENALTY,
    });
  } else {
    const airP = Math.round(airPenalty(airGrade));
    rows.push({
      factor: "air",
      label: "미세먼지",
      valueText: AIR_GRADE_LABEL[airGrade],
      note: airNote(air),
      status: airP > 0 ? "caution" : "good",
      penalty: airP,
      maxPenalty: AIR_MAX_PENALTY,
    });
  }

  if (!uv) {
    rows.push({
      factor: "uv",
      label: "자외선",
      valueText: "정보 없음",
      note: "조회 실패",
      status: "excluded",
      penalty: 0,
      maxPenalty: UV_MAX_PENALTY,
    });
  } else {
    const uvP = Math.round(linearPenalty(uv.value, UV_START, UV_MAX, UV_MAX_PENALTY));
    rows.push({
      factor: "uv",
      label: "자외선",
      valueText: String(uv.value),
      note: uvNote(uv.value),
      status: uvP > 0 ? "caution" : "good",
      penalty: uvP,
      maxPenalty: UV_MAX_PENALTY,
    });
  }

  return rows;
}
