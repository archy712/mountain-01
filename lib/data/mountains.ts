/**
 * 산 마스터·인기 산 서버 데이터 액세스 (Task 018). 서버 전용.
 *
 * 공개 데이터(RLS: anon select)를 쿠키 비의존 공개 클라이언트로 조회하고 `'use cache'`
 * 로 캐싱한다. 검색 Route Handler(정확도 정렬 + 인기도 tiebreak)와 홈 인기 산 카드가 쓴다.
 *
 * - 산 마스터는 거의 불변이라 1일 캐시(mountains-1d), 시드 갱신 시 태그로 무효화.
 * - 인기도는 `search_logs` 선택 로그(mountain_id) 집계로 도출, 1시간 캐시(search-1h).
 *   충분한 로그가 없으면 마스터 기본 순서로 백필해 항상 카드가 채워지게 한다.
 */

import { cacheLife, cacheTag } from "next/cache";
import type { MountainSuggestion } from "@/lib/types";
import { CACHE_PROFILE, sourceTag } from "@/lib/api/cache";
import { createPublicClient } from "@/lib/supabase/public";

/** 인기도 집계 시 훑는 최근 선택 로그 상한(무한 성장 방어). */
const RECENT_LOG_SCAN_LIMIT = 2000;

/** 산 마스터 전체를 캐시 조회한다(자동완성 필터 소스). */
export async function getAllMountains(): Promise<MountainSuggestion[]> {
  "use cache";
  cacheLife(CACHE_PROFILE.mountains);
  cacheTag(sourceTag("mountains"));

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("mountains")
    .select("id, name, region, altitude")
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data;
}

/**
 * 산 id → 선택 로그 수(인기도) 맵을 캐시 조회한다.
 * `search_logs.mountain_id` 가 있는 최근 로그만 집계한다(정렬 tiebreak 용).
 */
export async function getSearchLogCounts(): Promise<Record<string, number>> {
  "use cache";
  cacheLife(CACHE_PROFILE.search);
  cacheTag(sourceTag("search"));

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("search_logs")
    .select("mountain_id")
    .not("mountain_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(RECENT_LOG_SCAN_LIMIT);

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.mountain_id) counts[row.mountain_id] = (counts[row.mountain_id] ?? 0) + 1;
  }
  return counts;
}

/**
 * 인기 산 목록(홈 카드). 선택 로그 상위 → 부족분은 마스터 기본 순서로 백필.
 * 로그가 전혀 없어도 항상 `limit` 개를 채워 빈 그리드를 피한다.
 */
export async function getPopularMountains(limit = 4): Promise<MountainSuggestion[]> {
  "use cache";
  cacheLife(CACHE_PROFILE.search);
  cacheTag(sourceTag("search"), sourceTag("mountains"));

  const [mountains, counts] = await Promise.all([getAllMountains(), getSearchLogCounts()]);
  if (mountains.length === 0) return [];

  const byId = new Map(mountains.map((m) => [m.id, m]));

  // 1) 로그 수 상위 산부터
  const ranked: MountainSuggestion[] = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter((m): m is MountainSuggestion => m !== undefined);

  // 2) 부족분은 마스터 기본 순서(이름순)로 백필, 중복 제거
  const seen = new Set(ranked.map((m) => m.id));
  for (const m of mountains) {
    if (ranked.length >= limit) break;
    if (!seen.has(m.id)) {
      ranked.push(m);
      seen.add(m.id);
    }
  }

  return ranked.slice(0, limit);
}
