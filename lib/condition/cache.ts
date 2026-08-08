/**
 * 컨디션 점수 영속 캐시 (`condition_scores`, 결정 003 #9).
 *
 * 역할 경계: 원천 데이터(날씨·대기·자외선)의 신선도 캐싱은 Next `"use cache"` 가,
 * "가공 결과(점수)의 영속·공유"는 이 테이블이 담당한다. `/favorites` 요약(Task 026)이
 * 재계산 없이 최신 점수를 읽는 것이 주 용도다.
 *
 * - 조회: `(mountain_id, calc_version)` 의 최신 행을 읽고 `computed_at` 이 TTL 이내면 유효.
 *   버전 불일치 행은 무시(현재 `CALC_VERSION` 만 조회). 공개 SELECT 라 일반 서버 클라이언트로 읽는다.
 * - 저장: append(신규 행 insert). RLS 상 쓰기는 서비스 롤만 → admin 클라이언트 필요.
 *   서비스 롤 키가 없으면 저장을 건너뛴다(계산 결과는 그대로 반환, graceful degrade).
 */

import type { ConditionScore, ScoreBreakdownItem, ScoreGrade } from "@/lib/types";
import { SCORE_GRADE_LABEL } from "@/lib/types";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CALC_VERSION } from "./score";
import { gradeMessage } from "./grade";

/** 점수 캐시 유효 기간(초). 가장 신선한 입력(날씨 30분)에 맞춘다. */
export const CONDITION_CACHE_TTL_SECONDS = 30 * 60;

const VALID_GRADES = new Set<string>(Object.keys(SCORE_GRADE_LABEL));

/** DB grade 문자열을 ScoreGrade 로 안전 변환(미지의 값이면 null). */
function toScoreGrade(value: string): ScoreGrade | null {
  return VALID_GRADES.has(value) ? (value as ScoreGrade) : null;
}

/** jsonb breakdown 을 방어적으로 파싱(형태가 어긋나면 빈 배열). */
function parseBreakdown(raw: Json): ScoreBreakdownItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ScoreBreakdownItem[] = [];
  for (const el of raw) {
    if (el && typeof el === "object" && !Array.isArray(el)) {
      const { factor, label, penalty } = el as Record<string, unknown>;
      if (typeof factor === "string" && typeof label === "string" && typeof penalty === "number") {
        items.push({ factor: factor as ScoreBreakdownItem["factor"], label, penalty });
      }
    }
  }
  return items;
}

/**
 * 유효한(현재 버전 + TTL 이내) 캐시 점수를 조회한다. 없거나 만료면 null.
 * 조회 실패(네트워크 등)도 null 로 격리해 호출부가 재계산하도록 한다.
 */
export async function readCachedScore(mountainId: string): Promise<ConditionScore | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("condition_scores")
      .select("score, grade, breakdown, calc_version, computed_at")
      .eq("mountain_id", mountainId)
      .eq("calc_version", CALC_VERSION)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const ageMs = Date.now() - new Date(data.computed_at).getTime();
    if (ageMs > CONDITION_CACHE_TTL_SECONDS * 1000) return null;

    const grade = toScoreGrade(data.grade);
    if (grade === null) return null;

    return {
      score: data.score,
      grade,
      message: gradeMessage(grade),
      breakdown: parseBreakdown(data.breakdown),
      // 캐시 행에는 제외 변수 컬럼이 없으므로 breakdown 근거만 신뢰(요약 용도).
      excludedVariables: [],
      calcVersion: data.calc_version,
      computedAt: data.computed_at,
    };
  } catch {
    return null;
  }
}

/**
 * 계산된 점수를 append 저장한다. 서비스 롤 키가 없으면 조용히 건너뛴다(graceful).
 * 저장 실패는 삼켜서 응답 경로를 막지 않는다(캐시는 부가 기능).
 */
export async function writeScore(mountainId: string, score: ConditionScore): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return; // 서비스 롤 키 미설정 → 영속 생략

  try {
    await admin.from("condition_scores").insert({
      mountain_id: mountainId,
      score: score.score,
      grade: score.grade,
      breakdown: score.breakdown as unknown as Json,
      calc_version: score.calcVersion,
      computed_at: score.computedAt,
    });
  } catch {
    // 캐시 쓰기 실패는 무시(응답은 계산 결과로 이미 완성).
  }
}
