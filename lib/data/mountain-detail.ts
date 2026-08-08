/**
 * 산 상세 화면 서버 데이터 액세스 (Task 019). 서버 전용.
 *
 * 상세 페이지(Server Component)와 `/api/trails` Route Handler 가 공유한다.
 * - 산 메타: 산 마스터는 near-immutable 공개 데이터(RLS anon select)라 쿠키 비의존
 *   공개 클라이언트 + `'use cache'`(mountains-1d)로 조회한다. **캐시된 데이터라야
 *   페이지 top-level(Suspense 밖)에서 존재 검사→notFound() 를 블로킹으로 수행해
 *   스트리밍 200 이 아닌 진짜 404 를 낼 수 있다**(cacheComponents 규약, Next.js 스트리밍 가이드).
 * - 탐방로: 정적 스냅샷(trails 테이블)을 조회하고 **오늘 실효 상태**(계절 통제는 기간·조회일로
 *   재계산)를 매번 산출한다. DB 자체가 캐시 계층이라 외부 캐싱은 불필요하다.
 *
 * 날씨는 격자 좌표만 있으면 되므로 `lib/api/kma-forecast.ts` 의 `getWeatherSnapshot` 을
 * 직접 쓴다(여기서는 산 메타의 gridNx/gridNy 를 넘겨 재조회를 피한다).
 */

import { cacheLife, cacheTag } from "next/cache";
import type { Mountain, PartialResult, Trail, TrailPath, TrailStatus } from "@/lib/types";
import { apiError, CACHE_PROFILE, mountainTag, sourceTag } from "@/lib/api";
import { resolveTrailStatusOn } from "@/lib/trails/seasonal-closure";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

/**
 * 산 마스터 메타를 조회한다(없으면 null → 호출부에서 notFound()).
 * DB 행(snake_case) → 앱 표준 도메인 타입(camelCase)으로 정규화한다.
 * `'use cache'` 라 같은 요청의 generateMetadata·page 조회가 1회로 합쳐지고, 시드 갱신 시
 * `mountains` 태그로 무효화된다.
 */
export async function getMountainMeta(id: string): Promise<Mountain | null> {
  "use cache";
  cacheLife(CACHE_PROFILE.mountains);
  cacheTag(sourceTag("mountains"), mountainTag(id));

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("mountains")
    .select("id, name, region, altitude, lat, lng, grid_nx, grid_ny")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    region: data.region,
    altitude: data.altitude,
    lat: data.lat,
    lng: data.lng,
    gridNx: data.grid_nx,
    gridNy: data.grid_ny,
  };
}

/**
 * 산의 탐방로 목록 + 오늘 실효 상태를 반환한다.
 * - 조회 오류: `failure`(탐방로 섹션만 에러 폴백, 다른 소스는 독립)
 * - 미보유 산(국립공원 외): 빈 배열 success → 화면에서 "정보 없음"
 */
export async function getTrailsForMountain(
  id: string,
  now: Date = new Date(),
): Promise<PartialResult<Trail[]>> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("trails")
    .select("id, mountain_id, name, status, closed_reason, closed_period")
    .eq("mountain_id", id)
    .order("name", { ascending: true });

  if (error) {
    return {
      status: "failure",
      error: apiError("upstream_error", "탐방로 정보를 불러오지 못했습니다."),
    };
  }

  const trails: Trail[] = (rows ?? []).map((r) => {
    // 저장된 nominal 통제 → 오늘 실효 상태(계절 통제는 기간·조회일로 재계산).
    const effective = resolveTrailStatusOn(
      {
        status: r.status as TrailStatus,
        closedReason: r.closed_reason,
        closedPeriod: r.closed_period,
      },
      now,
    );
    return {
      id: r.id,
      mountainId: r.mountain_id,
      name: r.name,
      status: effective.status,
      closedReason: effective.closedReason,
      closedPeriod: effective.closedPeriod,
    };
  });

  return { status: "success", data: trails, fetchedAt: now.toISOString() };
}

/** path_geojson(jsonb)이 유효한 MultiLineString 인지 확인하고 좌표를 뽑아낸다. */
function extractMultiLineString(geojson: unknown): [number, number][][] | null {
  if (!geojson || typeof geojson !== "object") return null;
  const g = geojson as { type?: unknown; coordinates?: unknown };
  if (g.type !== "MultiLineString" || !Array.isArray(g.coordinates)) return null;
  const lines: [number, number][][] = [];
  for (const line of g.coordinates) {
    if (!Array.isArray(line)) continue;
    const pts: [number, number][] = [];
    for (const pt of line) {
      if (
        Array.isArray(pt) &&
        typeof pt[0] === "number" &&
        typeof pt[1] === "number" &&
        Number.isFinite(pt[0]) &&
        Number.isFinite(pt[1])
      ) {
        pts.push([pt[0], pt[1]]);
      }
    }
    if (pts.length >= 2) lines.push(pts);
  }
  return lines.length > 0 ? lines : null;
}

/**
 * 지도 오버레이용 등산로 경로 목록(Task 029). `path_geojson` 이 있는 trail 만 반환하며,
 * 각 경로에 **오늘 실효 상태**(계절 통제는 기간·조회일로 재계산)를 붙여 색상 구분에 쓴다.
 * 국립공원 외(GeoJSON 미보유) 산은 빈 배열 → 지도는 마커+목록 폴백으로만 표시된다.
 * 조회 실패도 빈 배열로 격리(오버레이 없음)해 지도 자체는 계속 동작한다.
 */
export async function getTrailPathsForMountain(
  id: string,
  now: Date = new Date(),
): Promise<TrailPath[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("trails")
    .select("id, name, status, closed_reason, closed_period, path_geojson")
    .eq("mountain_id", id)
    .not("path_geojson", "is", null);

  if (error || !rows) return [];

  const paths: TrailPath[] = [];
  for (const r of rows) {
    const coords = extractMultiLineString(r.path_geojson);
    if (!coords) continue;
    const effective = resolveTrailStatusOn(
      {
        status: r.status as TrailStatus,
        closedReason: r.closed_reason,
        closedPeriod: r.closed_period,
      },
      now,
    );
    paths.push({ id: r.id, name: r.name, status: effective.status, paths: coords });
  }
  return paths;
}
