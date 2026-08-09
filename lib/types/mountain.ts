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

/**
 * 난이도 지수 → 한국어 라벨(쉬움/보통/어려움). KNPS 지수는 값이 좁게 몰려 있어(대부분 2.0~2.5)
 * 실측 삼분위(≈2.1/2.35)로 상대 구분한다. 미상/미평가(null·0 이하)는 null(표시 안 함).
 */
export function trailDifficultyLabel(difficulty: number | null): "쉬움" | "보통" | "어려움" | null {
  if (difficulty == null || difficulty <= 0) return null;
  if (difficulty < 2.1) return "쉬움";
  if (difficulty < 2.35) return "보통";
  return "어려움";
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
