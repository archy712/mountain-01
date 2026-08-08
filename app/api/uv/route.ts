/**
 * GET /api/uv?mountainId=<uuid>
 *
 * 산의 areaNo(행정구역코드) 매핑으로 기상청 생활기상지수 V5 자외선(getUVIdxV5)을 조회·정규화해
 * 반환한다. 응답은 공통 `ApiResponse<UvIndex>`.
 *
 * 부분 폴백(결정 001 #6): areaNo 미커버(광주·전남 등)나 조회 실패 시 error 봉투로 격리해,
 * 상세 페이지·점수 계층이 UV 변수를 제외하고 나머지 정보를 계속 노출하게 한다.
 * HTTP 상태: 요청 오류만 4xx(400 파라미터 / 404 산 없음), 소스 결과는 200 + 봉투.
 */

import { NextResponse } from "next/server";
import type { ApiResponse, UvIndex } from "@/lib/types";
import { apiError } from "@/lib/api";
import { getUvIndex } from "@/lib/api/kma-uv";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const mountainId = searchParams.get("mountainId");

  if (!mountainId) {
    return NextResponse.json<ApiResponse<UvIndex>>(
      { status: "error", error: apiError("not_found", "mountainId 파라미터가 필요합니다.") },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: mountain, error: dbError } = await supabase
    .from("mountains")
    .select("id")
    .eq("id", mountainId)
    .maybeSingle();

  if (dbError) {
    return NextResponse.json<ApiResponse<UvIndex>>(
      { status: "error", error: apiError("upstream_error", "산 정보를 조회하지 못했습니다.") },
      { status: 200 },
    );
  }

  if (!mountain) {
    return NextResponse.json<ApiResponse<UvIndex>>(
      { status: "error", error: apiError("not_found", "요청하신 산을 찾을 수 없습니다.") },
      { status: 404 },
    );
  }

  const result = await getUvIndex(mountainId);

  if (result.status === "success") {
    return NextResponse.json<ApiResponse<UvIndex>>(
      { status: "ok", data: result.data, fetchedAt: result.fetchedAt },
      { status: 200 },
    );
  }

  if (result.status === "stale") {
    return NextResponse.json<ApiResponse<UvIndex>>(
      {
        status: "partial",
        data: result.data,
        fetchedAt: result.fetchedAt,
        issues: [result.error],
      },
      { status: 200 },
    );
  }

  return NextResponse.json<ApiResponse<UvIndex>>(
    { status: "error", error: result.error },
    { status: 200 },
  );
}
