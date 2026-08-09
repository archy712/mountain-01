/**
 * 산·탐방로 도메인 타입 (앱 표준 스키마, camelCase).
 * DB 행(snake_case)은 `Tables<"mountains">` 등으로 접근하고, 컴포넌트/서버 로직은
 * 아래 정규화 타입을 사용한다.
 */

import type { Normalizer } from "./api";

/**
 * 탐방로 개방 상태 (결정 001 #4).
 * - open:    개방
 * - closed:  통제
 * - partial: 부분통제
 * - unknown: 정보 없음(국립공원 외 커버리지 밖 등 폴백)
 */
export type TrailStatus = "open" | "closed" | "partial" | "unknown";

/** 상태 → 한국어 라벨 (색상 단독 구분 금지 원칙: 항상 텍스트 병기) */
export const TRAIL_STATUS_LABEL: Record<TrailStatus, string> = {
  open: "개방",
  closed: "통제",
  partial: "부분통제",
  unknown: "정보 없음",
};

export interface Mountain {
  id: string;
  name: string;
  /** 행정 지역(동명 산 구분용, 예: "서울·경기") */
  region: string;
  /** 고도(m). 미상이면 null */
  altitude: number | null;
  lat: number;
  lng: number;
  /** 기상청 격자 좌표(시드 시 사전 적재, 결정 002 #7) */
  gridNx: number;
  gridNy: number;
}

/**
 * 자동완성/인기 산 목록용 경량 산 요약 (Task 018).
 * 검색 API·인기 산 카드가 상세로 직결하는 데 필요한 최소 필드만 담는다.
 */
export interface MountainSuggestion {
  id: string;
  name: string;
  region: string;
  altitude: number | null;
}

export interface Trail {
  id: string;
  mountainId: string;
  name: string;
  status: TrailStatus;
  /** 통제 사유(통제/부분통제일 때). 없으면 null */
  closedReason: string | null;
  /** 통제 기간 원문(계절 통제, 예: "3월 1일~4월 30일"). 없으면 null */
  closedPeriod: string | null;
  /** 코스 총 거리(m). 미상이면 null (Task 033 #4) */
  distanceM: number | null;
  /** 난이도 지수(KNPS, 대략 1.0~3.2). 미상/미평가면 null */
  difficulty: number | null;
  /** 가는 시간(분). 미상이면 null */
  goMinutes: number | null;
  /** 오는 시간(분). 미상이면 null */
  comeMinutes: number | null;
  /** 경유지/상세구간(예: "갑사~금잔디고개~남매탑"). 없으면 null */
  waypoints: string | null;
}

/** 난이도 5단계(별 개수). 1=매우 쉬움 … 5=매우 어려움. */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

/** 난이도 단계 → 한국어 라벨. */
export const DIFFICULTY_LEVEL_LABEL: Record<DifficultyLevel, string> = {
  1: "매우 쉬움",
  2: "쉬움",
  3: "보통",
  4: "어려움",
  5: "매우 어려움",
};

/**
 * 오름 소요시간(분) → 1~5 단계(별 개수). **KNPS "난이도 지수"는 경사/지형만 반영하고 코스
 * 길이를 무시**해 등산객 체감과 크게 어긋난다(예: 12km·오름 7시간 50분 대청봉코스(백담)가
 * 지수 2.11로 "쉬움"). 오름 소요시간은 거리·경사를 함께 반영한 총 노력 지표이고 전 코스에
 * 존재(결측 0)하므로 이를 기준으로 삼는다. 실측 **5분위(≈45 / 80 / 120 / 210분)**로 별 1~5개에
 * 매핑한다. 미상(null·0 이하)은 null(별 대신 "정보 없음" 처리).
 */
export function trailDifficultyLevel(goMinutes: number | null): DifficultyLevel | null {
  if (goMinutes == null || goMinutes <= 0) return null;
  if (goMinutes <= 45) return 1;
  if (goMinutes <= 80) return 2;
  if (goMinutes <= 120) return 3;
  if (goMinutes <= 210) return 4;
  return 5;
}

export type TrailNormalizer = Normalizer<Trail[]>;

/**
 * 지도 폴리라인 오버레이용 등산로 경로 (Task 029).
 * courseID 세그먼트를 모은 MultiLineString 좌표와 오늘 실효 상태(색상 구분용)를 담는다.
 * `path_geojson` 이 없는 trail(국립공원 외)은 이 목록에서 제외되어 마커+목록 폴백으로만 표시된다.
 */
export interface TrailPath {
  id: string;
  name: string;
  status: TrailStatus;
  /** MultiLineString 좌표: 세그먼트 배열, 각 세그먼트는 [경도, 위도] 점 배열 */
  paths: [number, number][][];
}
