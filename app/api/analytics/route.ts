/**
 * POST /api/analytics  { event, anonId?, mountainId?, props? }
 *
 * 프라이버시-세이프 KPI 이벤트 로깅 (Task 035). 클라이언트(`lib/analytics/client.ts`)가
 * 검색·즐겨찾기·PWA 설치 등 익명 이벤트를 fire-and-forget 로 보낸다(개인정보 미수집).
 *
 * - RLS: `analytics_events_public_insert`(anon/authenticated insert only, select 차단).
 * - 최선노력 로깅이라 실패해도 사용자 흐름을 막지 않는다(200 흡수).
 * - event 는 화이트리스트로 검증해 임의 문자열 유입을 차단한다(테이블 CHECK 와 이중 방어).
 */

import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Json } from "@/lib/supabase/database.types";

/** analytics_events.event CHECK 제약과 동기화한 허용 이벤트 집합. */
const ALLOWED_EVENTS = new Set([
  "session_start",
  "search_session",
  "search_result_selected",
  "mountain_view",
  "favorite_add",
  "favorite_remove",
  "pwa_prompt_shown",
  "pwa_install_accepted",
  "pwa_install_dismissed",
  "app_installed",
]);

const MAX_ANON_ID_LENGTH = 64;

interface AnalyticsBody {
  event?: unknown;
  anonId?: unknown;
  mountainId?: unknown;
  props?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: AnalyticsBody;
  try {
    body = (await request.json()) as AnalyticsBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = typeof body.event === "string" ? body.event : "";
  if (!ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const anonId = typeof body.anonId === "string" ? body.anonId.slice(0, MAX_ANON_ID_LENGTH) : null;
  const mountainId = typeof body.mountainId === "string" ? body.mountainId : null;
  const props =
    body.props !== null && typeof body.props === "object" && !Array.isArray(body.props)
      ? (body.props as Json)
      : null;

  const supabase = createPublicClient();
  const { error } = await supabase.from("analytics_events").insert({
    event,
    anon_id: anonId,
    mountain_id: mountainId,
    props,
  });

  if (error) {
    // 로깅 실패는 조용히 흡수(집계 품질 저하만) — 사용자 흐름과 무관.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
