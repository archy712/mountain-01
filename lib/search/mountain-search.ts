/**
 * 산 자동완성 검색 코어 (Task 018) — 프레임워크·DB 무의존 순수 함수.
 *
 * 산 마스터가 30여 종으로 작아, 초성 검색까지 SQL 로 처리하기보다 캐시된 전체
 * 목록을 받아 JS 에서 필터·정렬한다(정확도 + 인기도). Route Handler(`/api/mountains/search`)
 * 가 DB 조회(캐시)와 인기도 집계를 주입하고, 이 함수는 순수 로직만 담당해 단위 검증이 쉽다.
 */

import type { MountainSuggestion } from "@/lib/types";
import { getChosung, isChosungQuery } from "./hangul";

/** 자동완성 기본 결과 상한. */
export const SEARCH_RESULT_LIMIT = 8;
/** 질의 최대 길이(방어적 상한). 초과분은 잘라 처리한다. */
export const MAX_QUERY_LENGTH = 40;

// 정확도 점수(높을수록 상위). 정렬 1순위.
const SCORE_NAME_EXACT = 100;
const SCORE_NAME_PREFIX = 80;
const SCORE_NAME_INCLUDES = 60;
const SCORE_CHOSUNG_PREFIX = 55;
const SCORE_CHOSUNG_INCLUDES = 45;
const SCORE_REGION_INCLUDES = 30;

export interface SearchOptions {
  /** 산 id → 인기도(선택 로그 수). 정렬 2순위 tiebreak. 없으면 0 취급. */
  popularity?: Record<string, number>;
  /** 결과 상한(기본 SEARCH_RESULT_LIMIT). */
  limit?: number;
}

/** 질의를 검색용으로 정규화한다(trim + 길이 상한). */
export function normalizeQuery(raw: string): string {
  return raw.trim().slice(0, MAX_QUERY_LENGTH);
}

/**
 * 단일 산이 질의에 얼마나 부합하는지 정확도 점수를 매긴다. 부합하지 않으면 0.
 * - 초성 전용 질의("ㅂㅎㅅ")는 이름의 초성열과 비교
 * - 그 외 질의는 이름 부분일치(정확/접두/포함) 우선, 지역 부분일치 보조
 */
function scoreMountain(m: MountainSuggestion, query: string): number {
  const name = m.name;

  if (isChosungQuery(query)) {
    const nameCho = getChosung(name);
    if (nameCho.startsWith(query)) return SCORE_CHOSUNG_PREFIX;
    if (nameCho.includes(query)) return SCORE_CHOSUNG_INCLUDES;
    return 0;
  }

  if (name === query) return SCORE_NAME_EXACT;
  if (name.startsWith(query)) return SCORE_NAME_PREFIX;
  if (name.includes(query)) return SCORE_NAME_INCLUDES;
  if (m.region.includes(query)) return SCORE_REGION_INCLUDES;
  return 0;
}

/**
 * 산 목록에서 질의에 맞는 후보를 정확도→인기도→이름 순으로 정렬해 상한만큼 반환한다.
 * 빈/공백 질의는 빈 배열.
 */
export function searchMountainList(
  mountains: MountainSuggestion[],
  rawQuery: string,
  options: SearchOptions = {},
): MountainSuggestion[] {
  const query = normalizeQuery(rawQuery);
  if (query === "") return [];

  const popularity = options.popularity ?? {};
  const limit = options.limit ?? SEARCH_RESULT_LIMIT;

  const scored = mountains
    .map((m) => ({ m, score: scoreMountain(m, query) }))
    .filter((x) => x.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pa = popularity[a.m.id] ?? 0;
    const pb = popularity[b.m.id] ?? 0;
    if (pb !== pa) return pb - pa;
    return a.m.name.localeCompare(b.m.name, "ko");
  });

  return scored.slice(0, limit).map((x) => x.m);
}
