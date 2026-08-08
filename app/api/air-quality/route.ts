/**
 * GET /api/air-quality?mountainId=<uuid>
 *
 * 산의 위경도로 최근접 대기측정소를 찾아(에어코리아 getNearbyMsrstnList) 실시간 PM10/PM2.5
 * (getMsrstnAcctoRltmMesureDnsty)를 조회·정규화해 반환한다. 응답은 공통 `ApiResponse<AirQuality>`.
 *
 * 부분 폴백(결정 001 #5): 인근 측정소가 없거나(no_station) 측정값을 못 얻으면 error 봉투로
 * 격리해, 상세 페이지·점수 계층이 해당 변수를 제외하고 나머지 정보를 계속 노출하게 한다.
 * HTTP 상태: 요청 오류만 4xx(400 파라미터 / 404 산 없음), 소스 결과는 200 + 봉투.
 */

import { NextResponse } from "next/server";
import type { AirQuality, ApiResponse } from "@/lib/types";
import { apiError } from "@/lib/api";
import { getAirQuality } from "@/lib/api/airkorea";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const mountainId = searchParams.get("mountainId");

  if (!mountainId) {
    return NextResponse.json<ApiResponse<AirQuality>>(
      { status: "error", error: apiError("not_found", "mountainId 파라미터가 필요합니다.") },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: mountain, error: dbError } = await supabase
    .from("mountains")
    .select("lat, lng")
    .eq("id", mountainId)
    .maybeSingle();

  if (dbError) {
    return NextResponse.json<ApiResponse<AirQuality>>(
      { status: "error", error: apiError("upstream_error", "산 정보를 조회하지 못했습니다.") },
      { status: 200 },
    );
  }

  if (!mountain) {
    return NextResponse.json<ApiResponse<AirQuality>>(
      { status: "error", error: apiError("not_found", "요청하신 산을 찾을 수 없습니다.") },
      { status: 404 },
    );
  }

  const result = await getAirQuality(mountainId, mountain.lat, mountain.lng);

  if (result.status === "success") {
    return NextResponse.json<ApiResponse<AirQuality>>(
      { status: "ok", data: result.data, fetchedAt: result.fetchedAt },
      { status: 200 },
    );
  }

  if (result.status === "stale") {
    return NextResponse.json<ApiResponse<AirQuality>>(
      {
        status: "partial",
        data: result.data,
        fetchedAt: result.fetchedAt,
        issues: [result.error],
      },
      { status: 200 },
    );
  }

  return NextResponse.json<ApiResponse<AirQuality>>(
    { status: "error", error: result.error },
    { status: 200 },
  );
}
