/**
 * 시간대별 컨디션 추이 순수 로직 (Task 039).
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
 */

import type {
  AirQuality,
  HourlyConditionTrend,
  HourlyConditionPoint,
  UvIndex,
  WeatherForecast,
  WeatherSnapshot,
} from "@/lib/types";
import { computeConditionScore } from "./score";

export interface HourlyConditionInput {
  /** 확장 예보(현재 스냅샷 + 시간별). 시간별 슬롯을 점수로 환산한다. */
  forecast: WeatherForecast;
  /** 스냅샷 대기질(모든 슬롯 공통). 결측 시 null → 감점 후보 제외 */
  air: AirQuality | null;
  /** 스냅샷 자외선(모든 슬롯 공통). 결측 시 null → 감점 후보 제외 */
  uv: UvIndex | null;
  /** 환산할 최대 슬롯 수(기본 8 = 앞으로 약 8개 시각) */
  limit?: number;
}

/**
 * 시간별 예보를 슬롯별 컨디션 점수로 환산한다.
 * 각 슬롯은 현재 스냅샷을 베이스로 시간 해상도가 높은 변수(기온·강수확률·강수형태·풍속)만
 * 슬롯 값으로 덮어써 `computeConditionScore` 에 넘긴다(대기질·자외선은 공통 적용).
 */
export function computeHourlyConditionTrend(input: HourlyConditionInput): HourlyConditionTrend {
  const { forecast, air, uv, limit = 8 } = input;

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
    return { date: h.date, time: h.time, score, grade };
  });

  // 가장 좋은 지점(동점이면 더 이른 시각). 점수가 같을 때 `>` 로만 갱신해 이른 슬롯을 유지한다.
  let bestIndex = -1;
  for (let i = 0; i < points.length; i++) {
    if (bestIndex === -1 || points[i].score > points[bestIndex].score) bestIndex = i;
  }

  return { points, bestIndex };
}
