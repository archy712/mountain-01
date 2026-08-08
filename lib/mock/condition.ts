/**
 * 컨디션 점수·장비·대기질·자외선 더미 데이터 (Phase 2 UI 전용, Task 008).
 *
 * Task 006 타입(`ConditionScore`, `GearItem`, `AirQuality`, `UvIndex`)을 준수한다.
 * 점수 계산 유틸(Task 023)·규칙 엔진(Task 024)이 붙기 전까지 2단계 화면
 * (Task 011: 게이지·감점 근거·장비 추천)의 렌더 검증에 사용한다.
 */

import type { AirQuality, ConditionScore, GearItem, UvIndex } from "@/lib/types";

/** 산별 컨디션 점수 — 등급 구간(매우좋음~위험)을 고루 포함 */
export const MOCK_CONDITION: Record<string, ConditionScore> = {
  bukhansan: {
    score: 88,
    grade: "excellent",
    message: "산행하기 완벽한 날이에요!",
    breakdown: [{ factor: "pop", label: "강수확률 20%", penalty: 5 }],
    excludedVariables: [],
    calcVersion: "v1",
    computedAt: new Date().toISOString(),
  },
  seoraksan: {
    score: 34,
    grade: "poor",
    message: "비바람이 강해 산행을 미루는 게 좋아요.",
    breakdown: [
      { factor: "pop", label: "강수확률 70%", penalty: 25 },
      { factor: "wind", label: "풍속 6.8m/s", penalty: 20 },
      { factor: "pty", label: "비", penalty: 15 },
    ],
    excludedVariables: [],
    calcVersion: "v1",
    computedAt: new Date().toISOString(),
  },
  jirisan: {
    score: 72,
    grade: "good",
    message: "산행하기 좋은 날이에요. 구름은 조금 있어요.",
    breakdown: [
      { factor: "pop", label: "강수확률 40%", penalty: 15 },
      { factor: "temp", label: "기온 12℃", penalty: 8 },
    ],
    excludedVariables: [],
    calcVersion: "v1",
    computedAt: new Date().toISOString(),
  },
  hallasan: {
    score: 48,
    grade: "fair",
    message: "바람이 강한 편이에요. 방풍 대비가 필요해요.",
    breakdown: [
      { factor: "wind", label: "풍속 9.2m/s", penalty: 28 },
      { factor: "pop", label: "강수확률 60%", penalty: 20 },
    ],
    // 대기질 측정소 매핑 실패로 계산 제외된 케이스(결정 001 #5)
    excludedVariables: ["air"],
    calcVersion: "v1",
    computedAt: new Date().toISOString(),
  },
  gwanaksan: {
    score: 94,
    grade: "excellent",
    message: "산행하기 완벽한 날이에요!",
    breakdown: [],
    excludedVariables: [],
    calcVersion: "v1",
    computedAt: new Date().toISOString(),
  },
  taebaeksan: {
    score: 16,
    grade: "dangerous",
    message: "폭설·강풍으로 위험해요. 산행을 자제하세요.",
    breakdown: [
      { factor: "pty", label: "눈", penalty: 35 },
      { factor: "temp", label: "기온 2℃", penalty: 25 },
      { factor: "wind", label: "풍속 7.5m/s", penalty: 24 },
    ],
    excludedVariables: [],
    calcVersion: "v1",
    computedAt: new Date().toISOString(),
  },
};

/** 산별 장비 추천 목록 */
export const MOCK_GEAR: Record<string, GearItem[]> = {
  bukhansan: [
    { id: "cap", name: "모자", reason: "자외선 지수 보통", trigger: "uv" },
    { id: "water", name: "충분한 식수", reason: "기온 18℃", trigger: "temp" },
  ],
  seoraksan: [
    { id: "rain-jacket", name: "방수 자켓", reason: "강수확률 70%", trigger: "pop" },
    { id: "windbreaker", name: "바람막이", reason: "풍속 6.8m/s", trigger: "wind" },
    { id: "warm-layer", name: "보온 레이어", reason: "기온 9℃", trigger: "temp" },
  ],
  jirisan: [{ id: "rain-cover", name: "배낭 레인커버", reason: "강수확률 40%", trigger: "pop" }],
  hallasan: [
    { id: "windbreaker", name: "바람막이", reason: "풍속 9.2m/s", trigger: "wind" },
    { id: "rain-jacket", name: "방수 자켓", reason: "강수확률 60%", trigger: "pop" },
  ],
  gwanaksan: [{ id: "cap", name: "모자", reason: "맑고 자외선 노출", trigger: "uv" }],
  taebaeksan: [
    { id: "crampons", name: "아이젠", reason: "적설·빙판 위험", trigger: "pty" },
    { id: "down-jacket", name: "패딩", reason: "기온 2℃", trigger: "temp" },
    { id: "gaiters", name: "스패츠", reason: "눈", trigger: "pty" },
  ],
};

/** 산별 대기질 (일부는 결측/측정소 없음 케이스) */
export const MOCK_AIR: Record<string, AirQuality> = {
  bukhansan: {
    pm10: 32,
    pm25: 15,
    pm10Grade: "good",
    pm25Grade: "good",
    stationName: "종로구",
    distanceKm: 3.2,
  },
  seoraksan: {
    pm10: 45,
    pm25: 22,
    pm10Grade: "moderate",
    pm25Grade: "moderate",
    stationName: "속초시",
    distanceKm: 8.7,
  },
  jirisan: {
    pm10: 78,
    pm25: 41,
    pm10Grade: "unhealthy",
    pm25Grade: "unhealthy",
    stationName: "구례군",
    distanceKm: 6.1,
  },
  gwanaksan: {
    pm10: 55,
    pm25: 28,
    pm10Grade: "moderate",
    pm25Grade: "moderate",
    stationName: "관악구",
    distanceKm: 2.5,
  },
  taebaeksan: {
    pm10: 18,
    pm25: 8,
    pm10Grade: "good",
    pm25Grade: "good",
    stationName: "태백시",
    distanceKm: 5.4,
  },
  // hallasan 은 인근 측정소 없음(no_station) 케이스로 의도적으로 제외
};

/** 산별 자외선 지수 */
export const MOCK_UV: Record<string, UvIndex> = {
  bukhansan: { value: 5, grade: "moderate", time: `${todayHour()}` },
  seoraksan: { value: 2, grade: "low", time: `${todayHour()}` },
  jirisan: { value: 6, grade: "high", time: `${todayHour()}` },
  hallasan: { value: 7, grade: "high", time: `${todayHour()}` },
  gwanaksan: { value: 8, grade: "very-high", time: `${todayHour()}` },
  taebaeksan: { value: 1, grade: "low", time: `${todayHour()}` },
};

/** 기준 시각 더미(YYYYMMDDHH) */
function todayHour(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}${String(d.getHours()).padStart(2, "0")}`;
}

export function getMockCondition(mountainId: string): ConditionScore | undefined {
  return MOCK_CONDITION[mountainId];
}

export function getMockGear(mountainId: string): GearItem[] {
  return MOCK_GEAR[mountainId] ?? [];
}

export function getMockAir(mountainId: string): AirQuality | undefined {
  return MOCK_AIR[mountainId];
}

export function getMockUv(mountainId: string): UvIndex | undefined {
  return MOCK_UV[mountainId];
}
