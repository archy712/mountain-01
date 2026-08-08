/**
 * GET /api/trails?mountainId=<uuid>
 *
 * 산의 탐방로 목록과 **오늘 기준 개방/통제 상태**를 반환한다.
 * - 통제 데이터는 국립공원공단 정적 스냅샷을 trails 테이블에 적재해 둔 것(라이브 호출 없음).
 * - 계절 통제(산불방지)는 저장된 closed_period 와 조회일(KST)을 비교해 실효 상태를 재계산한다.
 * - 국립공원 외(도립·근교산 등) 미보유 산은 빈 목록 → 화면에서 "정보 없음" 폴백.
 *
 * DB 자체가 캐시 계층(정적 스냅샷)이라 외부 API 캐싱은 불필요하다. 오늘 상태 계산은
 * 요청 시각 기준으로 매번 수행해 자정 경계에도 정확하다.
 */

import { NextResponse } from "next/server";
import type { ApiResponse, Trail } from "@/lib/types";
import { apiError } from "@/lib/api";
import { getTrailsForMountain } from "@/lib/data/mountain-detail";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const mountainId = searchParams.get("mountainId");

  if (!mountainId) {
    return NextResponse.json<ApiResponse<Trail[]>>(
      { status: "error", error: apiError("not_found", "mountainId 파라미터가 필요합니다.") },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: mountain, error: mErr } = await supabase
    .from("mountains")
    .select("id")
    .eq("id", mountainId)
    .maybeSingle();

  if (mErr) {
    return NextResponse.json<ApiResponse<Trail[]>>(
      { status: "error", error: apiError("upstream_error", "산 정보를 조회하지 못했습니다.") },
      { status: 200 },
    );
  }
  if (!mountain) {
    return NextResponse.json<ApiResponse<Trail[]>>(
      { status: "error", error: apiError("not_found", "요청하신 산을 찾을 수 없습니다.") },
      { status: 404 },
    );
  }

  // 탐방로 조회 + 오늘 실효 상태 계산은 상세 페이지와 공유하는 데이터 계층에 위임.
  const result = await getTrailsForMountain(mountainId);

  if (result.status === "success") {
    return NextResponse.json<ApiResponse<Trail[]>>(
      { status: "ok", data: result.data, fetchedAt: result.fetchedAt },
      { status: 200 },
    );
  }

  // getTrailsForMountain 은 조회 오류만 failure 로 돌린다(미보유 산은 빈 목록 success).
  return NextResponse.json<ApiResponse<Trail[]>>(
    { status: "error", error: result.error },
    { status: 200 },
  );
}
