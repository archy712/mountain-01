/**
 * 산 추천 후보 데이터 액세스 (Task 042). 서버 전용.
 *
 * 신규 외부 소스 없이 보유 데이터(`mountains` 지역·고도 + `trails` 오름시간 파생 난이도)만으로
 * "이런 산 어때요?" 필터형 추천 후보를 만든다. 지역·고도대·난이도 필터/정렬은 전부
 * 클라이언트(`components/mountain-recommend.tsx`)가 담당하므로, 여기서는 후보 전체를 한 번만
 * 캐시 조회해 넘긴다(데이터 재요청 없음).
 *
 * 산 마스터·탐방로 스냅샷 모두 near-immutable 공개 데이터라 산 마스터와 동일한 1일 캐시
 * (mountains-1d)를 쓰고, 시드 갱신 시 `mountains`/`trails` 소스 태그로 무효화된다.
 */

import { cacheLife, cacheTag } from "next/cache";
import type { DifficultyLevel } from "@/lib/types";
import { CACHE_PROFILE, sourceTag } from "@/lib/api/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { representativeDifficulty } from "@/lib/trails/summary";

/** 추천 카드 1건: 이름·지역·고도 + 코스에서 파생한 대표 난이도(별 1~5, 미상 null). */
export interface RecommendMountain {
  id: string;
  name: string;
  region: string;
  altitude: number | null;
  difficulty: DifficultyLevel | null;
}

/**
 * 추천 후보(전체 산) + 산별 대표 난이도를 캐시 조회한다.
 * 난이도는 각 산의 코스 오름시간(`trails.go_minutes`) 목록을 `representativeDifficulty`로
 * 중앙값 환산해 붙인다. 코스가 없는 산(국립공원 외)은 난이도 null → "정보 없음".
 */
export async function getRecommendMountains(): Promise<RecommendMountain[]> {
  "use cache";
  cacheLife(CACHE_PROFILE.mountains);
  cacheTag(sourceTag("mountains"), sourceTag("trails"));

  const supabase = createPublicClient();
  const [{ data: mountains, error: mErr }, { data: trails }] = await Promise.all([
    supabase
      .from("mountains")
      .select("id, name, region, altitude")
      .order("name", { ascending: true }),
    supabase.from("trails").select("mountain_id, go_minutes"),
  ]);

  if (mErr || !mountains) return [];

  // 산 → 코스 오름시간 목록으로 그룹핑(난이도 파생 입력).
  const goByMountain = new Map<string, (number | null)[]>();
  for (const t of trails ?? []) {
    const list = goByMountain.get(t.mountain_id);
    if (list) list.push(t.go_minutes);
    else goByMountain.set(t.mountain_id, [t.go_minutes]);
  }

  return mountains.map((m) => ({
    id: m.id,
    name: m.name,
    region: m.region,
    altitude: m.altitude,
    difficulty: representativeDifficulty(goByMountain.get(m.id) ?? []),
  }));
}
