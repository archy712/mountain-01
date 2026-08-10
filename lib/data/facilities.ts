/**
 * 산 편의시설(화장실) 서버 데이터 액세스 (Task 045). 서버 전용.
 *
 * 편의시설은 국립공원공단 포인트 데이터를 적재한 **near-immutable 정적 시드**라, 산 메타와
 * 동일하게 쿠키 비의존 공개 클라이언트 + `'use cache'`(mountains-1d) 로 조회한다. 시드가
 * 갱신되면 `mountains` 소스 태그로 함께 무효화된다(같은 정적 도메인). 미보유 산(국립공원 외)은
 * 빈 배열 → 상세에서 섹션 미노출. DB 자체가 캐시 계층이라 외부 캐싱은 불필요하다.
 */

import { cacheLife, cacheTag } from "next/cache";
import type { Facility, FacilityType } from "@/lib/types";
import { CACHE_PROFILE, mountainTag, sourceTag } from "@/lib/api";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * 산의 편의시설 목록을 반환한다(이름순). 조회 실패/미보유 산은 빈 배열로 격리해
 * (섹션만 사라지고) 다른 정보·페이지에 영향을 주지 않는다.
 */
export async function getFacilitiesForMountain(id: string): Promise<Facility[]> {
  "use cache";
  cacheLife(CACHE_PROFILE.mountains);
  cacheTag(sourceTag("mountains"), mountainTag(id));

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("facilities")
    .select("id, mountain_id, type, name, lat, lng, accessible, capacity, address, elevation")
    .eq("mountain_id", id)
    .order("name", { ascending: true });

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    mountainId: r.mountain_id,
    type: r.type as FacilityType,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    accessible: r.accessible,
    capacity: r.capacity,
    address: r.address,
    elevation: r.elevation,
  }));
}
