import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // 외부 API 응답 캐싱용 커스텀 cacheLife 프로필 (결정 003 #8 캐시 키·TTL 표).
  // 소스 모듈은 `'use cache'` 함수 안에서 cacheLife("weather-30m") 등으로 참조한다.
  // 값은 lib/api/cache.ts 의 CACHE_TTL_SECONDS 와 동기화한다(단일 출처).
  // stale: 재검증 전 즉시 제공 허용 구간 / revalidate: 백그라운드 갱신 주기(=발표 주기 정렬)
  // expire: 이 시간을 넘기면 차단식 재검증(상한). 발표를 놓치지 않는 선에서 여유를 둔다.
  cacheLife: {
    "weather-30m": {
      stale: 30 * 60,
      revalidate: 30 * 60, // 날씨(D-0) 30분
      expire: 60 * 60,
    },
    "vilage-3h": {
      stale: 3 * 60 * 60,
      revalidate: 3 * 60 * 60, // 단기예보(D+1↑) 3시간
      expire: 6 * 60 * 60,
    },
    "air-1h": {
      stale: 60 * 60,
      revalidate: 60 * 60, // 대기질 1시간
      expire: 2 * 60 * 60,
    },
    "uv-3h": {
      stale: 3 * 60 * 60,
      revalidate: 3 * 60 * 60, // 자외선 3시간
      expire: 6 * 60 * 60,
    },
    "trails-6h": {
      stale: 6 * 60 * 60,
      revalidate: 6 * 60 * 60, // 탐방로(정적+오늘 통제 계산) 6시간
      expire: 12 * 60 * 60,
    },
    "fire-3h": {
      stale: 3 * 60 * 60,
      revalidate: 3 * 60 * 60, // 산불위험예보(산림청, 3시간 간격) 3시간 (Task 043)
      expire: 6 * 60 * 60,
    },
    // 산 마스터(거의 불변)·검색 로그 집계용 (Task 018). 시드 갱신 시 태그로 무효화.
    "mountains-1d": {
      stale: 24 * 60 * 60,
      revalidate: 24 * 60 * 60, // 산 마스터 목록 1일
      expire: 48 * 60 * 60,
    },
    "search-1h": {
      stale: 60 * 60,
      revalidate: 60 * 60, // 인기 산/검색 로그 집계 1시간
      expire: 2 * 60 * 60,
    },
  },
};

export default nextConfig;
