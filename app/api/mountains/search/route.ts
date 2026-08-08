/**
 * GET /api/mountains/search?q=<질의>
 *
 * 산 이름 자동완성. 산 마스터가 30여 종으로 작아 캐시된 전체 목록을 받아 JS 에서
 * 부분일치 + 초성("ㅂㅎㅅ"→북한산) + 지역 검색을 수행하고, 정확도→인기도 순으로
 * 정렬해 상한(SEARCH_RESULT_LIMIT)만큼 반환한다(결정 002 #2: 결과는 상세 직결용 후보).
 *
 * - 빈/공백 질의는 200 + 빈 목록(에러 아님) — 입력 초기화 시 드롭다운을 즉시 닫기 위함.
 * - DB 조회·인기도 집계는 `'use cache'`(mountains-1d / search-1h)라 웜 캐시 후 거의 무비용.
 */

import { NextResponse } from "next/server";
import type { ApiResponse, MountainSuggestion } from "@/lib/types";
import { getAllMountains, getSearchLogCounts } from "@/lib/data/mountains";
import { normalizeQuery, searchMountainList } from "@/lib/search/mountain-search";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = normalizeQuery(searchParams.get("q") ?? "");

  if (query === "") {
    return NextResponse.json<ApiResponse<MountainSuggestion[]>>({
      status: "ok",
      data: [],
      fetchedAt: new Date().toISOString(),
    });
  }

  const [mountains, popularity] = await Promise.all([getAllMountains(), getSearchLogCounts()]);
  const results = searchMountainList(mountains, query, { popularity });

  return NextResponse.json<ApiResponse<MountainSuggestion[]>>({
    status: "ok",
    data: results,
    fetchedAt: new Date().toISOString(),
  });
}
