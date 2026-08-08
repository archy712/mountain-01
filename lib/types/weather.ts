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
