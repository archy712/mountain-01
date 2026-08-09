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
    .select(
      "id, mountain_id, name, status, closed_reason, closed_period, distance_m, difficulty, go_minutes, come_minutes, segment",
    )
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
      distanceM: r.distance_m,
      difficulty: r.difficulty,
      goMinutes: r.go_minutes,
      comeMinutes: r.come_minutes,
      waypoints: r.segment,
    };
  });

  return { status: "success", data: trails, fetchedAt: now.toISOString() };
}

/**
 * 세그먼트 내부의 비정상적으로 큰 점 간격은 데이터 단절(원본 GPS 순서 뒤섞임/결측)로 본다.
 * 이 값보다 크게 벌어진 연속 점 사이에서 선을 끊어, 지도에 긴 "직선"이 그려지는 아티팩트를
 * 없앤다(원본에 최대 17km 점프 존재 확인). RDP 단순화로 실제 직선 구간은 2점으로 줄어들 수
 * 있어(수백 m) 임계값을 1km 로 높게 잡아 정상 지오메트리는 보존한다(Task 033 #2).
 */
const MAX_SEGMENT_GAP_M = 1000;

/** [경도,위도] 두 점 사이 거리(m). equirectangular 근사(국지 스케일 충분). */
function metersBetween(a: [number, number], b: [number, number]): number {
  const latRad = (a[1] * Math.PI) / 180;
  const dx = (b[0] - a[0]) * 111320 * Math.cos(latRad);
  const dy = (b[1] - a[1]) * 110540;
  return Math.hypot(dx, dy);
}

/** 연속 점 간격이 maxGap 을 넘으면 선을 끊어 여러 하위 선으로 나눈다(≥2점만 유지). */
function splitOnGaps(pts: [number, number][], maxGap: number): [number, number][][] {
  const out: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i > 0 && metersBetween(pts[i - 1], pts[i]) > maxGap) {
      if (cur.length >= 2) out.push(cur);
      cur = [];
    }
    cur.push(pts[i]);
  }
  if (cur.length >= 2) out.push(cur);
  return out;
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
    // 큰 간격에서 끊어 직선 아티팩트를 제거한다(Task 033 #2).
    for (const sub of splitOnGaps(pts, MAX_SEGMENT_GAP_M)) lines.push(sub);
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
