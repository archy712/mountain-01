/**
 * 점수 → 등급/메시지 매핑 (Task 023, 결정 003 #11 동결 구간).
 *
 * 구간·메시지는 v1 동결값이다. 변경 시 문서 개정 + `calcVersion` 증가로만 반영한다
 * (docs/decisions/003-caching-scoring.md #10·#11). 등급 경계 상수는 도메인 타입의
 * `SCORE_GRADE_THRESHOLDS`(단일 출처)를 그대로 사용한다.
 */

import { SCORE_GRADE_THRESHOLDS, type ScoreGrade } from "@/lib/types";

/**
 * 등급별 안내 메시지 (결정 003 #11 동결표 기준, 앱 보이스로 다듬음).
 * "지금 이 산에 가도 되는지"를 한 줄로 판단시키는 결론 문구.
 */
export const SCORE_GRADE_MESSAGE: Record<ScoreGrade, string> = {
  excellent: "산행하기 완벽한 날이에요!",
  good: "무난해요. 기본 장비만 챙기세요.",
  fair: "산행은 가능하지만 대비가 필요해요.",
  poor: "비추천이에요. 꼭 간다면 철저히 대비하세요.",
  dangerous: "산행을 자제하는 게 좋아요.",
};

/**
 * 0~100 점수를 등급으로 매핑한다. 경계는 하한 포함(80→매우좋음).
 * 입력이 구간 밖이어도 안전하게 최저 등급으로 수렴한다.
 */
export function scoreToGrade(score: number): ScoreGrade {
  for (const { min, grade } of SCORE_GRADE_THRESHOLDS) {
    if (score >= min) return grade;
  }
  // SCORE_GRADE_THRESHOLDS 의 마지막(min:0) 이 보장하지만, 타입 안전을 위한 폴백.
  return "dangerous";
}

/** 등급 안내 메시지를 반환한다. */
export function gradeMessage(grade: ScoreGrade): string {
  return SCORE_GRADE_MESSAGE[grade];
}
