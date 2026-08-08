/**
 * GET /api/weather?mountainId=<uuid>
 *
 * 산의 격자 좌표(grid_nx/grid_ny)로 기상청 단기예보를 조회해 오늘 날씨 스냅샷을 반환한다.
 * 응답은 공통 `ApiResponse<WeatherSnapshot>` 봉투. 소스 실패는 크래시 없이 error/partial
 * 봉투로 격리해, 상세 페이지(Task 019)가 탐방로 등 다른 정보를 계속 노출할 수 있게 한다.
 *
 * HTTP 상태: 요청 오류만 4xx(400 파라미터 누락 / 404 산 없음), 그 외 소스 결과는 200 + 봉투.
 */

import { NextResponse } from "next/server";
import type { ApiResponse, WeatherSnapshot } from "@/lib/types";
import { apiError } from "@/lib/api";
import { getWeatherSnapshot } from "@/lib/api/kma-forecast";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const mountainId = searchParams.get("mountainId");

  if (!mountainId) {
    return NextResponse.json<ApiResponse<WeatherSnapshot>>(
      { status: "error", error: apiError("not_found", "mountainId 파라미터가 필요합니다.") },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: mountain, error: dbError } = await supabase
    .from("mountains")
    .select("grid_nx, grid_ny")
    .eq("id", mountainId)
    .maybeSingle();

  if (dbError) {
    return NextResponse.json<ApiResponse<WeatherSnapshot>>(
      { status: "error", error: apiError("upstream_error", "산 정보를 조회하지 못했습니다.") },
      { status: 200 },
    );
  }

  if (!mountain) {
    return NextResponse.json<ApiResponse<WeatherSnapshot>>(
      { status: "error", error: apiError("not_found", "요청하신 산을 찾을 수 없습니다.") },
      { status: 404 },
    );
  }

  const result = await getWeatherSnapshot(mountainId, {
    nx: mountain.grid_nx,
    ny: mountain.grid_ny,
  });

  if (result.status === "success") {
    return NextResponse.json<ApiResponse<WeatherSnapshot>>(
      { status: "ok", data: result.data, fetchedAt: result.fetchedAt },
      { status: 200 },
    );
  }

  if (result.status === "stale") {
    // 신선 조회는 실패했지만 마지막 성공 캐시로 표시는 가능 → partial + issues.
    return NextResponse.json<ApiResponse<WeatherSnapshot>>(
      {
        status: "partial",
        data: result.data,
        fetchedAt: result.fetchedAt,
        issues: [result.error],
      },
      { status: 200 },
    );
  }

  return NextResponse.json<ApiResponse<WeatherSnapshot>>(
    { status: "error", error: result.error },
    { status: 200 },
  );
}
