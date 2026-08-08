/**
 * POST /api/search-logs  { query: string, mountainId?: string }
 *
 * 익명 검색 로깅(결정 002 #14). 사용자가 자동완성 후보를 **선택**한 시점에
 * 질의 + 선택한 산 id 를 insert-only 로 기록한다(개인정보 미수집). 인기 산 집계의 원천이다.
 *
 * - RLS: `search_logs_public_insert`(anon/authenticated insert only, select 차단).
 * - 최선노력(best-effort) 로깅이라 실패해도 사용자 흐름을 막지 않는다(클라이언트는 fire-and-forget).
 */

import { NextResponse } from "next/server";
import { MAX_QUERY_LENGTH } from "@/lib/search/mountain-search";
import { createPublicClient } from "@/lib/supabase/public";

interface LogBody {
  query?: unknown;
  mountainId?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: LogBody;
  try {
    body = (await request.json()) as LogBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim().slice(0, MAX_QUERY_LENGTH) : "";
  if (query === "") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const mountainId = typeof body.mountainId === "string" ? body.mountainId : null;

  const supabase = createPublicClient();
  const { error } = await supabase.from("search_logs").insert({ query, mountain_id: mountainId });

  if (error) {
    // 로깅 실패는 조용히 흡수(집계 품질 저하만) — 사용자 흐름과 무관.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
