/**
 * 시간대별 컨디션 추이 순수 로직 (Task 039, + 안전 출발 반영).
 *
 * "지금 갈 만한가"(단일 점수, Task 023)를 "오늘 언제 가면 좋은가"로 확장한다.
 * 단기예보의 시각별 슬롯을 각각 컨디션 점수로 환산해 추이를 만든다. 프레임워크·네트워크
 * 의존이 없는 순수 함수라 단위 검증이 가능하다(오케스트레이션은 service.ts).
 *
 * 시간 해상도 원칙:
 *  - 기온·강수확률·강수형태·풍속은 **슬롯별 값**을 쓴다(시간별 예보에 존재).
 *  - 대기질·자외선은 시간별 해상도가 없어(스냅샷 1값) **모든 슬롯에 공통 적용**한다.
 *    → 시간에 따라 달라지는 건 날씨 변수뿐이므로, 추이는 "날씨가 언제 좋아지는지"를 반영한다.
 * 기존 감점 엔진(`computeConditionScore`)을 슬롯마다 그대로 재사용해 단일 점수와 로직이 갈리지 않게 한다.
 *
 * 안전 출발(daylight): 왕복이 긴 산은 컨디션만 보고 늦은 시각을 추천하면 일몰 뒤 하산 위험이
 * 있다(예: 한라산 왕복 ~9시간). 긴 코스 왕복시간+일몰로 "안전 출발 마감"을 계산해, 추천을
 * 일몰 전 하산 가능한 시간대로 제한한다. 공식 입산통제 시각 데이터는 없어 일몰 기준으로 파생한다.
 */

import type {
  AirQuality,
  DaylightGuidance,
  HourlyConditionTrend,
  HourlyConditionPoint,
  UvIndex,
  WeatherForecast,
  WeatherSnapshot,
} from "@/lib/types";
import { computeConditionScore } from "./score";

/** 안전 출발 계산 입력(왕복 소요·일몰). 없으면 daylight 제약 없이 기존 동작. */
export interface DaylightInput {
  /** 참조 왕복 소요(분) — service 에서 개방 코스 상위 80퍼센타일로 산출 */
  roundTripMin: number;
  /** 오늘 일몰(KST) 자정 기준 분(0~1439) */
  sunsetMinutes: number;
  /** 일몰 전 하산 여유 버퍼(분). 기본 60 */
  bufferMin?: number;
}

export interface HourlyConditionInput {
  /** 확장 예보(현재 스냅샷 + 시간별). 시간별 슬롯을 점수로 환산한다. */
  forecast: WeatherForecast;
  /** 스냅샷 대기질(모든 슬롯 공통). 결측 시 null → 감점 후보 제외 */
  air: AirQuality | null;
  /** 스냅샷 자외선(모든 슬롯 공통). 결측 시 null → 감점 후보 제외 */
  uv: UvIndex | null;
  /** 환산할 최대 슬롯 수(기본 8 = 앞으로 약 8개 시각) */
  limit?: number;
  /** 안전 출발(일몰) 입력. 없으면 daylight 제약 없이 컨디션만으로 추천한다. */
  daylight?: DaylightInput;
}

/** "HHmm" 슬롯 시각 → 자정 기준 분. */
function slotStartMinutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(2, 4));
}

/** 자정 기준 분 → KST "HH:MM"(0~24h 클램프). */
function minutesToHm(min: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * 시간별 예보를 슬롯별 컨디션 점수로 환산하고, 안전 출발 제약을 반영해 추천 시각을 고른다.
 * 각 슬롯은 현재 스냅샷을 베이스로 시간 해상도가 높은 변수(기온·강수확률·강수형태·풍속)만
 * 슬롯 값으로 덮어써 `computeConditionScore` 에 넘긴다(대기질·자외선은 공통 적용).
 */
export function computeHourlyConditionTrend(input: HourlyConditionInput): HourlyConditionTrend {
  const { forecast, air, uv, limit = 8, daylight } = input;

  const todayDate = forecast.current.baseDate;
  const buffer = daylight?.bufferMin ?? 60;
  // 일몰 전 하산하려면 늦어도 이 시각(분)까지 출발해야 한다.
  const latestStartMin = daylight ? daylight.sunsetMinutes - daylight.roundTripMin - buffer : null;

  const points: HourlyConditionPoint[] = forecast.hourly.slice(0, limit).map((h) => {
    const slotWeather: WeatherSnapshot = {
      ...forecast.current,
      tempC: h.tempC,
      pop: h.pop,
      pty: h.pty,
      sky: h.sky,
      windSpeedMs: h.windSpeedMs,
      baseDate: h.date,
      baseTime: h.time,
    };
    const { score, grade } = computeConditionScore({ weather: slotWeather, air, uv });
    // 오늘 슬롯만 왕복시간 제약을 적용한다(다음날 새벽 슬롯은 하루가 남아 안전).
    const daylightSafe =
      latestStartMin === null || h.date !== todayDate
        ? true
        : slotStartMinutes(h.time) <= latestStartMin;
    return { date: h.date, time: h.time, score, grade, daylightSafe };
  });

  // 가장 좋은 지점: 안전 슬롯 우선(동점이면 이른 시각), 안전 슬롯이 없으면 전체에서 최고.
  const pickBest = (pred: (p: HourlyConditionPoint) => boolean): number => {
    let idx = -1;
    for (let i = 0; i < points.length; i++) {
      if (!pred(points[i])) continue;
      if (idx === -1 || points[i].score > points[idx].score) idx = i;
    }
    return idx;
  };
  let bestIndex = pickBest((p) => p.daylightSafe);
  // 안전 슬롯이 하나도 없으면(이미 늦음) 전체 최고로 폴백하되 allTooLate 로 표시.
  const allTooLate = daylight != null && bestIndex === -1 && points.length > 0;
  if (bestIndex === -1) bestIndex = pickBest(() => true);

  const dl: DaylightGuidance | null =
    daylight && latestStartMin !== null
      ? {
          roundTripMin: daylight.roundTripMin,
          sunsetLabel: minutesToHm(daylight.sunsetMinutes),
          latestStartLabel: minutesToHm(latestStartMin),
          allTooLate,
        }
      : null;

  return { points, bestIndex, daylight: dl };
}
