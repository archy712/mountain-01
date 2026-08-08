/**
 * 장비 추천 규칙 엔진 (Task 024, PRD 4.2 규칙 테이블).
 *
 * PRD 4.2 규칙 표를 **선언적 룰셋**으로 구현한다. 각 규칙은 발동 조건(evaluate)과 추천
 * 장비 목록(gear)을 선언하며, 발동 시 근거 문구(reason)와 발동 변수(trigger)를 부착한다.
 *
 * 규칙(우선순위 오름차순 = 목록 상단):
 *   비/강수(POP≥50 또는 PTY 비·소나기) → 방수 자켓·배낭 레인커버
 *   저온(TMP≤5℃)                        → 방한 장갑·넥워머·보온 레이어
 *   고온(TMP≥28℃)                       → 여벌 물·전해질·모자
 *   강풍(WSD≥10m/s)                      → 바람막이·체온 유지 레이어
 *   미세먼지(나쁨↑)                      → KF 마스크
 *   자외선(UV≥6)                         → 선크림·선글라스·챙모자
 *
 * 부분 폴백: 대기질/자외선이 결측(null)이면 해당 규칙은 **평가에서 제외**한다(오탐 방지).
 * 중복 장비(같은 id)는 더 높은 우선순위의 근거를 남기고 제거한다.
 */

import type {
  AirGrade,
  AirQuality,
  GearItem,
  PrecipitationType,
  ScoreFactor,
  UvIndex,
  WeatherSnapshot,
} from "@/lib/types";
import { AIR_GRADE_LABEL, PTY_LABEL } from "@/lib/types";

export interface GearInputs {
  weather: WeatherSnapshot;
  /** 결측 시 null → 미세먼지 규칙 평가 제외 */
  air?: AirQuality | null;
  /** 결측 시 null → 자외선 규칙 평가 제외 */
  uv?: UvIndex | null;
}

/** 규칙 발동 시 근거·발동변수. 미발동/결측이면 null. */
type RuleHit = { reason: string; trigger: ScoreFactor } | null;

interface GearDef {
  id: string;
  name: string;
}

interface GearRule {
  /** 오름차순 정렬 기준(작을수록 상단). 안전 관련 장비를 앞에 둔다. */
  priority: number;
  evaluate: (i: GearInputs) => RuleHit;
  gear: GearDef[];
}

/** 방수 장비를 촉발하는 강수형태(비 계열). */
const RAIN_PTY: ReadonlySet<PrecipitationType> = new Set(["rain", "shower"]);

/** 미세먼지 '나쁨' 이상 여부. */
function isBadAir(grade: AirGrade): boolean {
  return grade === "unhealthy" || grade === "very-unhealthy";
}

/** PM10·PM2.5 중 더 나쁜 등급(둘 다 null 이면 null). */
function worstAirGrade(air: AirQuality): AirGrade | null {
  const order: Record<AirGrade, number> = {
    good: 0,
    moderate: 1,
    unhealthy: 2,
    "very-unhealthy": 3,
  };
  const { pm10Grade: a, pm25Grade: b } = air;
  if (a === null) return b;
  if (b === null) return a;
  return order[a] >= order[b] ? a : b;
}

const GEAR_RULES: readonly GearRule[] = [
  {
    // 비/강수 — POP≥50 또는 PTY 비·소나기. 발동 근거는 강수형태 우선, 없으면 강수확률.
    priority: 10,
    evaluate: ({ weather }) => {
      if (RAIN_PTY.has(weather.pty)) {
        return { reason: PTY_LABEL[weather.pty], trigger: "pty" };
      }
      if (weather.pop >= 50) {
        return { reason: `강수확률 ${weather.pop}%`, trigger: "pop" };
      }
      return null;
    },
    gear: [
      { id: "rain-jacket", name: "방수 자켓" },
      { id: "rain-cover", name: "배낭 레인커버" },
    ],
  },
  {
    // 저온 — TMP≤5℃
    priority: 20,
    evaluate: ({ weather }) =>
      weather.tempC <= 5 ? { reason: `기온 ${Math.round(weather.tempC)}℃`, trigger: "temp" } : null,
    gear: [
      { id: "winter-gloves", name: "방한 장갑" },
      { id: "neck-warmer", name: "넥워머" },
      { id: "thermal-layer", name: "보온 레이어" },
    ],
  },
  {
    // 고온 — TMP≥28℃
    priority: 30,
    evaluate: ({ weather }) =>
      weather.tempC >= 28
        ? { reason: `기온 ${Math.round(weather.tempC)}℃`, trigger: "temp" }
        : null,
    gear: [
      { id: "extra-water", name: "여벌 물" },
      { id: "electrolyte", name: "전해질" },
      { id: "sun-cap", name: "모자" },
    ],
  },
  {
    // 강풍 — WSD≥10m/s
    priority: 40,
    evaluate: ({ weather }) =>
      weather.windSpeedMs >= 10
        ? { reason: `풍속 ${weather.windSpeedMs}m/s`, trigger: "wind" }
        : null,
    gear: [
      { id: "windbreaker", name: "바람막이" },
      { id: "warmth-layer", name: "체온 유지 레이어" },
    ],
  },
  {
    // 미세먼지 — '나쁨' 이상. air 결측(null)이면 평가 제외.
    priority: 50,
    evaluate: ({ air }) => {
      if (!air) return null;
      const grade = worstAirGrade(air);
      return grade && isBadAir(grade)
        ? { reason: `미세먼지 ${AIR_GRADE_LABEL[grade]}`, trigger: "air" }
        : null;
    },
    gear: [{ id: "kf-mask", name: "KF 마스크" }],
  },
  {
    // 자외선 — UV≥6('높음'). uv 결측(null)이면 평가 제외.
    priority: 60,
    evaluate: ({ uv }) =>
      uv && uv.value >= 6 ? { reason: `자외선 ${uv.value}`, trigger: "uv" } : null,
    gear: [
      { id: "sunscreen", name: "선크림" },
      { id: "sunglasses", name: "선글라스" },
      { id: "brim-hat", name: "챙모자" },
    ],
  },
];

/**
 * 입력 조건에 맞는 추천 장비 목록을 산출한다.
 * 규칙을 우선순위 오름차순으로 평가해 발동 규칙의 장비를 모으고, 같은 id 중복은
 * 먼저(더 높은 우선순위) 등장한 것을 남기고 제거한다. 결측 변수 규칙은 자동 제외된다.
 */
export function recommendGear(inputs: GearInputs): GearItem[] {
  const seen = new Set<string>();
  const result: GearItem[] = [];

  for (const rule of [...GEAR_RULES].sort((a, b) => a.priority - b.priority)) {
    const hit = rule.evaluate(inputs);
    if (!hit) continue;
    for (const def of rule.gear) {
      if (seen.has(def.id)) continue;
      seen.add(def.id);
      result.push({ id: def.id, name: def.name, reason: hit.reason, trigger: hit.trigger });
    }
  }

  return result;
}
