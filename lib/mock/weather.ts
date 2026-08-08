/**
 * 날씨 더미 데이터 (Phase 2 UI 전용, Task 008).
 *
 * Task 006 `WeatherSnapshot` 타입을 준수한다. 정규화 계층(Task 016)이 붙기 전까지
 * 상세 화면(Task 010)의 `WeatherSummaryCard` 렌더 검증에 사용한다.
 */

import type { WeatherSnapshot } from "@/lib/types";

/** 발표 기준 시각 더미(오늘 05시 발표 가정) */
function todayBaseDate(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/** 산별 날씨 스냅샷 — 맑음/흐림·비 등 다양한 조건을 UI 검증용으로 포함 */
export const MOCK_WEATHER: Record<string, WeatherSnapshot> = {
  bukhansan: {
    tempC: 18,
    pop: 20,
    sky: "clear",
    pty: "none",
    windSpeedMs: 2.4,
    humidity: 45,
    baseDate: todayBaseDate(),
    baseTime: "0500",
  },
  seoraksan: {
    tempC: 9,
    pop: 70,
    sky: "cloudy",
    pty: "rain",
    windSpeedMs: 6.8,
    humidity: 82,
    baseDate: todayBaseDate(),
    baseTime: "0500",
  },
  jirisan: {
    tempC: 12,
    pop: 40,
    sky: "partly-cloudy",
    pty: "none",
    windSpeedMs: 3.1,
    humidity: 60,
    baseDate: todayBaseDate(),
    baseTime: "0500",
  },
  hallasan: {
    tempC: 15,
    pop: 60,
    sky: "cloudy",
    pty: "shower",
    windSpeedMs: 9.2,
    humidity: 78,
    baseDate: todayBaseDate(),
    baseTime: "0500",
  },
  gwanaksan: {
    tempC: 20,
    pop: 10,
    sky: "clear",
    pty: "none",
    windSpeedMs: 1.8,
    humidity: 40,
    baseDate: todayBaseDate(),
    baseTime: "0500",
  },
  taebaeksan: {
    tempC: 2,
    pop: 80,
    sky: "cloudy",
    pty: "snow",
    windSpeedMs: 7.5,
    humidity: 85,
    baseDate: todayBaseDate(),
    baseTime: "0500",
  },
};

/** 산 id 로 날씨 스냅샷 조회 */
export function getMockWeather(mountainId: string): WeatherSnapshot | undefined {
  return MOCK_WEATHER[mountainId];
}
