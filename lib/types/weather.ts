/**
 * 날씨 도메인 타입 (기상청 단기/초단기예보 정규화, 결정 001 #3).
 * 원시 코드(SKY/PTY 숫자)는 정규화 계층에서 시맨틱 값으로 변환해 저장한다.
 */

import type { Normalizer } from "./api";

/** 하늘상태 (SKY: 1 맑음 / 3 구름많음 / 4 흐림) */
export type SkyCondition = "clear" | "partly-cloudy" | "cloudy";

export const SKY_LABEL: Record<SkyCondition, string> = {
  clear: "맑음",
  "partly-cloudy": "구름많음",
  cloudy: "흐림",
};

/** SKY 원시 코드 → 시맨틱 매핑 */
export const SKY_CODE_MAP: Record<string, SkyCondition> = {
  "1": "clear",
  "3": "partly-cloudy",
  "4": "cloudy",
};

/**
 * 강수형태 (PTY).
 * 단기: 0 없음 / 1 비 / 2 비·눈 / 3 눈 / 4 소나기
 * 초단기 추가: 5 빗방울 / 6 빗방울눈날림 / 7 눈날림
 */
export type PrecipitationType =
  "none" | "rain" | "rain-snow" | "snow" | "shower" | "drizzle" | "drizzle-snow" | "snow-flurry";

export const PTY_LABEL: Record<PrecipitationType, string> = {
  none: "없음",
  rain: "비",
  "rain-snow": "비/눈",
  snow: "눈",
  shower: "소나기",
  drizzle: "빗방울",
  "drizzle-snow": "빗방울눈날림",
  "snow-flurry": "눈날림",
};

/** PTY 원시 코드 → 시맨틱 매핑 */
export const PTY_CODE_MAP: Record<string, PrecipitationType> = {
  "0": "none",
  "1": "rain",
  "2": "rain-snow",
  "3": "snow",
  "4": "shower",
  "5": "drizzle",
  "6": "drizzle-snow",
  "7": "snow-flurry",
};

/** 앱 표준 날씨 스냅샷 */
export interface WeatherSnapshot {
  /** TMP 기온(℃) */
  tempC: number;
  /** 체감온도(℃) — 기온·습도·풍속으로 산출(호주 기상청 apparent temperature, Task 034) */
  feelsLikeC: number;
  /** 오늘 최저기온(℃, TMN). 발표 시각이 지나 값이 없으면 null */
  tempMinC: number | null;
  /** 오늘 최고기온(℃, TMX). 발표 시각이 지나 값이 없으면 null */
  tempMaxC: number | null;
  /** POP 강수확률(%) */
  pop: number;
  /** SKY 하늘상태 */
  sky: SkyCondition;
  /** PTY 강수형태 */
  pty: PrecipitationType;
  /** WSD 풍속(m/s) */
  windSpeedMs: number;
  /** REH 상대습도(%) */
  humidity: number;
  /** 발표 기준 일자(YYYYMMDD) */
  baseDate: string;
  /** 발표 기준 시각(HHmm) */
  baseTime: string;
}

export type WeatherNormalizer = Normalizer<WeatherSnapshot>;

/** 시간대별 예보 1건 (Task 034). 단기예보 응답의 시각별 슬롯을 뽑아 만든다. */
export interface HourlyForecast {
  /** 예보 일자(YYYYMMDD) */
  date: string;
  /** 예보 시각(HHmm, 정시) */
  time: string;
  /** TMP 기온(℃) */
  tempC: number;
  /** POP 강수확률(%) */
  pop: number;
  /** SKY 하늘상태 */
  sky: SkyCondition;
  /** PTY 강수형태 */
  pty: PrecipitationType;
}

/** 일자별 예보 1건 (Task 034). 단기예보 범위(오늘~약 3일)의 하루 요약. */
export interface DailyForecast {
  /** 예보 일자(YYYYMMDD) */
  date: string;
  /** 최저기온(℃, TMN 우선·없으면 시간별 최소). 결측 시 null */
  tempMinC: number | null;
  /** 최고기온(℃, TMX 우선·없으면 시간별 최대). 결측 시 null */
  tempMaxC: number | null;
  /** 대표(최대) 강수확률(%) */
  pop: number;
  /** 대표 하늘상태(정오 근처 슬롯) */
  sky: SkyCondition;
  /** 대표 강수형태(정오 근처 슬롯) */
  pty: PrecipitationType;
}

/**
 * 확장 날씨 예보 묶음 (Task 034). 동일한 단기예보 원시 응답 한 번으로
 * 현재 스냅샷 + 시간대별 + 일자별을 함께 만들어 추가 네트워크 없이 제공한다.
 */
export interface WeatherForecast {
  /** 현재(대상 시각 최근접) 스냅샷 */
  current: WeatherSnapshot;
  /** 앞으로의 시간대별 예보(가까운 순) */
  hourly: HourlyForecast[];
  /** 오늘부터의 일자별 예보(오늘 포함 최대 3일) */
  daily: DailyForecast[];
}
