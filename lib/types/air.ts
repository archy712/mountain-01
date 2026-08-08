/**
 * 대기질·자외선 도메인 타입 (에어코리아·기상청 생활기상지수 V5 정규화).
 * 측정소 매핑(결정 001 #5)·자외선 지역코드(결정 001 #6) 규칙은 정규화 계층에서 처리한다.
 */

import type { Normalizer } from "./api";

/** 미세먼지 등급 (에어코리아: 1 좋음 / 2 보통 / 3 나쁨 / 4 매우나쁨) */
export type AirGrade = "good" | "moderate" | "unhealthy" | "very-unhealthy";

export const AIR_GRADE_LABEL: Record<AirGrade, string> = {
  good: "좋음",
  moderate: "보통",
  unhealthy: "나쁨",
  "very-unhealthy": "매우나쁨",
};

/** 에어코리아 등급 코드("1"~"4") → 시맨틱 매핑 */
export const AIR_GRADE_CODE_MAP: Record<string, AirGrade> = {
  "1": "good",
  "2": "moderate",
  "3": "unhealthy",
  "4": "very-unhealthy",
};

export interface AirQuality {
  /** PM10 농도(㎍/㎥). 결측이면 null */
  pm10: number | null;
  /** PM2.5 농도(㎍/㎥). 결측이면 null */
  pm25: number | null;
  pm10Grade: AirGrade | null;
  pm25Grade: AirGrade | null;
  /** 매핑된 측정소명 */
  stationName: string;
  /** 산 ↔ 측정소 거리(km) */
  distanceKm: number;
}

/** 자외선 등급 (낮음/보통/높음/매우높음/위험) */
export type UvGrade = "low" | "moderate" | "high" | "very-high" | "extreme";

export const UV_GRADE_LABEL: Record<UvGrade, string> = {
  low: "낮음",
  moderate: "보통",
  high: "높음",
  "very-high": "매우높음",
  extreme: "위험",
};

/** UV 지수 → 등급 구간 경계(하한 포함). 0~2 낮음, 3~5 보통, 6~7 높음, 8~10 매우높음, 11+ 위험 */
export const UV_GRADE_THRESHOLDS: ReadonlyArray<{ min: number; grade: UvGrade }> = [
  { min: 11, grade: "extreme" },
  { min: 8, grade: "very-high" },
  { min: 6, grade: "high" },
  { min: 3, grade: "moderate" },
  { min: 0, grade: "low" },
];

export interface UvIndex {
  /** UV 지수 값 */
  value: number;
  grade: UvGrade;
  /** 기준 시각(YYYYMMDDHH, 06·18시 발표 기준) */
  time: string;
}

export type AirQualityNormalizer = Normalizer<AirQuality>;
export type UvNormalizer = Normalizer<UvIndex>;
