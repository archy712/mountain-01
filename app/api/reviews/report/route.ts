/**
 * 후기 신고 API (Task 048). 로그인 사용자가 부적절 후기를 신고한다.
 *
 * 신고자는 타인 후기라 직접 UPDATE 권한이 없으므로, DB 의 SECURITY DEFINER 함수
 * `report_review(p_review_id)` 를 RPC 로 호출한다. 이 함수가 중복 신고를 멱등 처리하고,
 * 누적 신고가 임계치(3회)에 도달하면 `is_hidden` 을 자동 전환한다(관리자 개입 없는 모더레이션).
 * 결과 상태(숨김 여부·누적 수)는 노출하지 않는다 — 어뷰징 신호가 되지 않도록.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ReportBody {
  reviewId?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (!userId) {
    return NextResponse.json({ status: "error", error: "로그인이 필요해요." }, { status: 401 });
  }

  let body: ReportBody;
  try {
    body = (await request.json()) as ReportBody;
  } catch {
    return NextResponse.json(
      { status: "error", error: "요청 형식이 올바르지 않아요." },
      { status: 400 },
    );
  }

  const reviewId = body.reviewId;
  if (typeof reviewId !== "string" || reviewId.length === 0) {
    return NextResponse.json({ status: "error", error: "reviewId 가 필요해요." }, { status: 400 });
  }

  const { error } = await supabase.rpc("report_review", { p_review_id: reviewId });
  if (error) {
    return NextResponse.json(
      { status: "error", error: "신고를 접수하지 못했어요." },
      { status: 500 },
    );
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
