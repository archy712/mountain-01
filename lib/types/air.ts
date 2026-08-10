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

// ── 대기질 예보통보 (에어코리아 getMinuDustFrcstDspth, Task 052) ──────────
//
// 실시간 측정값(오늘·지금)과 달리 **오늘·내일 예보 등급**(권역 단위)을 제공한다.
// 발생원인(informCause)·발표시각과 함께 "내일/주말 산행 계획"을 돕는다.

/** 예보통보 한글 등급("좋음"~"매우나쁨") → `AirGrade` 매핑. */
export const AIR_GRADE_KOR_MAP: Record<string, AirGrade> = {
  좋음: "good",
  보통: "moderate",
  나쁨: "unhealthy",
  매우나쁨: "very-unhealthy",
};

/** 등급 심각도(값이 클수록 나쁨). 여러 권역/토큰을 아우를 때 최악값 선택에 쓴다. */
export const AIR_GRADE_SEVERITY: Record<AirGrade, number> = {
  good: 0,
  moderate: 1,
  unhealthy: 2,
  "very-unhealthy": 3,
};

/** 예보 대상일(오늘/내일) 한 칸의 PM10·PM2.5 등급. */
export interface DustForecastDay {
  /** 예보 대상일 "YYYY-MM-DD" */
  date: string;
  /** 화면 라벨 구분 */
  when: "today" | "tomorrow";
  pm10Grade: AirGrade | null;
  pm25Grade: AirGrade | null;
}

export interface DustForecast {
  /** 오늘·내일(가용 범위) 예보 등급 */
  days: DustForecastDay[];
  /** 발생원인 요약(국내/국외/황사 등). 없으면 null */
  cause: string | null;
  /** 매핑된 예보권역명(예: "서울", "영동·영서") */
  regionName: string;
  /** 발표시각 라벨(예: "2026-08-10 11시 발표") */
  announcedAt: string;
}

export type DustForecastNormalizer = Normalizer<DustForecast>;
