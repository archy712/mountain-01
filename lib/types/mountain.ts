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
}

export type TrailNormalizer = Normalizer<Trail[]>;
