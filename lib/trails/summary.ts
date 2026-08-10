/**
 * 탐방로 코스 요약 통계 (Task 034). 목록 상단에 "개방/통제 현황·거리 범위"를 압축해
 * 보여주기 위한 순수 집계. 프레임워크 무의존이라 단위 검증 가능하다.
 */

import type { DifficultyLevel, Trail } from "@/lib/types";
import { trailDifficultyLevel } from "@/lib/types";

export interface TrailSummary {
  /** 전체 코스 수 */
  total: number;
  /** 개방 */
  open: number;
  /** 전면 통제 */
  closed: number;
  /** 부분 통제 */
  partial: number;
  /** 상태 미상(정보 없음) */
  unknown: number;
  /** 최단 코스 거리(km). 거리 정보가 하나도 없으면 null */
  shortestKm: number | null;
  /** 최장 코스 거리(km). 거리 정보가 하나도 없으면 null */
  longestKm: number | null;
}

/** 탐방로 목록 → 요약 통계. 빈 목록이면 null. */
export function summarizeTrails(trails: Trail[]): TrailSummary | null {
  if (trails.length === 0) return null;

  let open = 0;
  let closed = 0;
  let partial = 0;
  let unknown = 0;
  const distances: number[] = [];

  for (const t of trails) {
    switch (t.status) {
      case "open":
        open++;
        break;
      case "closed":
        closed++;
        break;
      case "partial":
        partial++;
        break;
      default:
        unknown++;
    }
    if (t.distanceM != null && t.distanceM > 0) distances.push(t.distanceM);
  }

  return {
    total: trails.length,
    open,
    closed,
    partial,
    unknown,
    shortestKm: distances.length ? Math.min(...distances) / 1000 : null,
    longestKm: distances.length ? Math.max(...distances) / 1000 : null,
  };
}

/**
 * 산 단위 대표 난이도 (Task 042 산 추천 필터용). 코스별 오름 소요시간(`goMinutes`)을
 * `trailDifficultyLevel`로 별 1~5단계 환산한 뒤 **중앙값(하위 중위값)**을 대표값으로 삼는다.
 *
 * 최댓값(가장 힘든 코스)이나 최솟값(가장 쉬운 코스)은 한쪽 극단 코스 하나에 좌우돼 산의
 * 전형적 난이도를 왜곡한다(예: 쉬운 둘레길 1개가 있는 험산이 "쉬움"으로 뜸). 중앙값은
 * 코스 분포의 중심을 잡아 "이 산에 가면 대체로 이 정도"를 나타낸다. 시간 정보가 있는 코스가
 * 하나도 없으면(국립공원 외 등) null → 화면에서 "정보 없음" 처리.
 */
export function representativeDifficulty(goMinutesList: (number | null)[]): DifficultyLevel | null {
  const levels = goMinutesList
    .map((m) => trailDifficultyLevel(m))
    .filter((l): l is DifficultyLevel => l !== null)
    .sort((a, b) => a - b);
  if (levels.length === 0) return null;
  return levels[Math.floor((levels.length - 1) / 2)];
}
