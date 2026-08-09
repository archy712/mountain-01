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
import type { Mountain, MountainSuggestion } from "@/lib/types";
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
 * 산림청 100대명산 목록을 캐시 조회한다(`/top100` 화면, Task 036).
 * 거의 불변 콘텐츠라 산 마스터와 동일한 1일 캐시(mountains-1d). 정렬/필터는 클라이언트가
 * 담당하므로 여기서는 이름 오름차순으로 안정 정렬만 해서 넘긴다.
 */
export async function getTop100Mountains(): Promise<MountainSuggestion[]> {
  "use cache";
  cacheLife(CACHE_PROFILE.mountains);
  cacheTag(sourceTag("mountains"));

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("mountains")
    .select("id, name, region, altitude")
    .eq("is_top100", true)
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
 * 홈 "지금 갈 만한 산" 콜드스타트 백필용 대표 산 큐레이션 순서.
 *
 * 검색 로그가 부족할 때 이름 가나다순(→ 가리산·가리왕산 같은 생소한 산)으로 채우면 홈이
 * 낯설어진다. 로그가 쌓이기 전까지는 **인지도 높은 대표 산**부터 후보 풀을 채워, 홈에서
 * 계산·정렬한 상위 컨디션이 친숙한 산으로 보이게 한다. 이름 기준이라 동명 산(지리산 등)은
 * 둘 다 후보에 들어올 수 있으나, 상세·카드가 지역을 병기하므로 혼동은 없다.
 */
const CURATED_POPULAR_NAMES = [
  "북한산",
  "설악산",
  "지리산",
  "한라산",
  "관악산",
  "무등산",
  "도봉산",
  "계룡산",
  "속리산",
  "소백산",
  "오대산",
  "덕유산",
  "태백산",
  "치악산",
  "팔공산",
  "가야산",
];

/**
 * 홈 "지금 갈 만한 산" 후보 풀 — 인기 랭킹(로그 상위 → **대표 산 큐레이션** → 이름순 백필)
 * 이지만 **격자·위경도까지 포함한 full `Mountain`** 을 돌려준다. 홈에서 각 후보의 오늘
 * 컨디션을 계산해 점수순으로 재정렬하기 위해 좌표가 필요하기 때문이다(`MountainSuggestion`
 * 엔 없음). 컨디션 계산 비용을 감안해 풀 크기는 소수(기본 8)로 제한한다.
 */
export async function getPopularMountainsGeo(limit = 8): Promise<Mountain[]> {
  "use cache";
  cacheLife(CACHE_PROFILE.search);
  cacheTag(sourceTag("search"), sourceTag("mountains"));

  const supabase = createPublicClient();
  const [{ data: rows }, counts] = await Promise.all([
    supabase
      .from("mountains")
      .select("id, name, region, altitude, lat, lng, grid_nx, grid_ny")
      .order("name", { ascending: true }),
    getSearchLogCounts(),
  ]);
  if (!rows || rows.length === 0) return [];

  const mountains: Mountain[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    region: r.region,
    altitude: r.altitude,
    lat: r.lat,
    lng: r.lng,
    gridNx: r.grid_nx,
    gridNy: r.grid_ny,
  }));
  const byId = new Map(mountains.map((m) => [m.id, m]));

  const ranked: Mountain[] = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter((m): m is Mountain => m !== undefined);

  const seen = new Set(ranked.map((m) => m.id));

  // 백필 순서: (1) 대표 산 큐레이션(CURATED 순서) → (2) 나머지 이름순.
  // `mountains` 는 이미 이름 오름차순이라, 큐레이션 밖(순위 Infinity)은 안정 정렬로 이름순이
  // 유지된다. 동명 산은 큐레이션 순위가 같아 이름/원본 순서로 함께 앞당겨진다.
  const curatedRank = new Map(CURATED_POPULAR_NAMES.map((name, i) => [name, i]));
  const backfill = mountains
    .filter((m) => !seen.has(m.id))
    .sort(
      (a, b) =>
        (curatedRank.get(a.name) ?? Number.POSITIVE_INFINITY) -
        (curatedRank.get(b.name) ?? Number.POSITIVE_INFINITY),
    );

  for (const m of backfill) {
    if (ranked.length >= limit) break;
    ranked.push(m);
    seen.add(m.id);
  }

  return ranked.slice(0, limit);
}
