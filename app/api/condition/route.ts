/**
 * GET /api/condition?mountainId=<uuid>
 *
 * 산의 날씨·대기질·자외선을 병렬 조회해 컨디션 점수(0~100·등급·감점 근거)를 산출한다.
 * 점수 계산은 서버 순수 엔진(`lib/condition/score.ts`)에서만 수행하고 `calcVersion` 으로
 * 태깅한다(결정 003 #10). 결과는 `condition_scores` 에 캐시된다.
 *
 * 부분 폴백: 대기질/자외선 실패는 해당 변수만 제외(`excludedVariables`)하고 계속 계산한다.
 * 날씨가 사용 불가면 점수를 낼 수 없어 error 봉투를 반환한다. 응답은 공통 `ApiResponse<ConditionScore>`.
 * HTTP 상태: 요청 오류만 4xx(400 파라미터 / 404 산 없음), 소스 결과는 200 + 봉투.
 */

import { NextResponse } from "next/server";
import type { ApiResponse, ConditionScore } from "@/lib/types";
import { apiError } from "@/lib/api";
import { getConditionForMountain } from "@/lib/condition";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const mountainId = searchParams.get("mountainId");

  if (!mountainId) {
    return NextResponse.json<ApiResponse<ConditionScore>>(
      { status: "error", error: apiError("not_found", "mountainId 파라미터가 필요합니다.") },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: mountain, error: dbError } = await supabase
    .from("mountains")
    .select("id, grid_nx, grid_ny, lat, lng")
    .eq("id", mountainId)
    .maybeSingle();

  if (dbError) {
    return NextResponse.json<ApiResponse<ConditionScore>>(
      { status: "error", error: apiError("upstream_error", "산 정보를 조회하지 못했습니다.") },
      { status: 200 },
    );
  }

  if (!mountain) {
    return NextResponse.json<ApiResponse<ConditionScore>>(
      { status: "error", error: apiError("not_found", "요청하신 산을 찾을 수 없습니다.") },
      { status: 404 },
    );
  }

  const result = await getConditionForMountain({
    id: mountain.id,
    gridNx: mountain.grid_nx,
    gridNy: mountain.grid_ny,
    lat: mountain.lat,
    lng: mountain.lng,
  });

  if (result.status === "success") {
    return NextResponse.json<ApiResponse<ConditionScore>>(
      { status: "ok", data: result.data, fetchedAt: result.fetchedAt },
      { status: 200 },
    );
  }

  if (result.status === "stale") {
    return NextResponse.json<ApiResponse<ConditionScore>>(
      {
        status: "partial",
        data: result.data,
        fetchedAt: result.fetchedAt,
        issues: [result.error],
      },
      { status: 200 },
    );
  }

  return NextResponse.json<ApiResponse<ConditionScore>>(
    { status: "error", error: result.error },
    { status: 200 },
  );
}
