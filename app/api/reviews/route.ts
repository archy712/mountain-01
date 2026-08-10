/**
 * 후기·별점 CRUD API (Task 048). 로그인 사용자 본인 데이터만 다룬다.
 *
 * 방문완료(`app/api/visited/route.ts`)와 같은 패턴이다. 요청 쿠키 세션 서버 클라이언트라
 * 모든 쿼리에 **RLS** 가 적용된다(reviews: 공개 read, **방문완료한 산만 insert**, 본인 update/delete).
 * user_id 는 클라이언트 입력이 아니라 세션 클레임에서 채워 타인 행 조작을 원천 차단한다.
 *
 * - POST   { mountainId, rating, body? } → 작성/수정 upsert. 별점 필수(1~5), 본문 선택.
 *   방문완료하지 않은 산이면 RLS insert 정책이 막아 403 을 준다("방문완료한 산만").
 * - DELETE ?id= | ?mountainId= | { id | mountainId } → 본인 후기 삭제.
 * 비로그인은 401 JSON(페이지 리다이렉트 아님 — 클라이언트가 로그인 유도).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BODY_LENGTH = 1000;

interface ReviewBody {
  mountainId?: unknown;
  rating?: unknown;
  body?: unknown;
  id?: unknown;
}

async function getUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
}

function badRequest(message: string) {
  return NextResponse.json({ status: "error", error: message }, { status: 400 });
}

function unauthorized() {
  return NextResponse.json({ status: "error", error: "로그인이 필요해요." }, { status: 401 });
}

/** 본인 프로필에서 표시명 스냅샷을 읽는다(닉네임 우선, 없으면 이름). 실패 시 null. */
async function getAuthorName(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("username, full_name").maybeSingle();
  const name = data?.username ?? data?.full_name ?? null;
  return typeof name === "string" && name.trim().length > 0 ? name.trim() : null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return unauthorized();

  let body: ReviewBody;
  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    return badRequest("요청 형식이 올바르지 않아요.");
  }

  const mountainId = body.mountainId;
  if (typeof mountainId !== "string" || mountainId.length === 0) {
    return badRequest("mountainId 가 필요해요.");
  }

  // 별점 필수: 1~5 정수만 허용.
  const rating = body.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return badRequest("별점은 1~5 사이여야 해요.");
  }

  // 본문 선택: 문자열이면 트리밍·길이 제한, 빈 문자열/미입력은 null.
  let reviewText: string | null = null;
  if (typeof body.body === "string") {
    const trimmed = body.body.trim();
    if (trimmed.length > MAX_BODY_LENGTH) {
      return badRequest(`후기는 ${MAX_BODY_LENGTH}자 이내로 써 주세요.`);
    }
    reviewText = trimmed.length > 0 ? trimmed : null;
  }

  const authorName = await getAuthorName(supabase);

  // (user_id, mountain_id) 유니크 → upsert 로 작성/수정을 한 경로로 처리.
  // 신규 insert 는 RLS with_check(방문완료 EXISTS)를 통과해야 하므로, 미방문이면 여기서 막힌다.
  const { data, error } = await supabase
    .from("reviews")
    .upsert(
      {
        user_id: userId,
        mountain_id: mountainId,
        rating,
        body: reviewText,
        author_name: authorName,
      },
      { onConflict: "user_id,mountain_id" },
    )
    .select("id, rating, body, author_name, created_at, updated_at")
    .single();

  if (error) {
    // RLS with_check 위반(방문완료 안 함) → 42501. 그 외는 일반 오류.
    if (error.code === "42501") {
      return NextResponse.json(
        { status: "error", error: "방문완료한 산에만 후기를 쓸 수 있어요." },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { status: "error", error: "후기를 저장하지 못했어요." },
      { status: 500 },
    );
  }

  return NextResponse.json({ status: "ok", data }, { status: 200 });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return unauthorized();

  const url = new URL(request.url);
  let reviewId = url.searchParams.get("id");
  let mountainId = url.searchParams.get("mountainId");
  if (!reviewId && !mountainId) {
    try {
      const b = (await request.json()) as ReviewBody;
      if (typeof b.id === "string") reviewId = b.id;
      if (typeof b.mountainId === "string") mountainId = b.mountainId;
    } catch {
      // 본문 없음 — 쿼리스트링만으로 판단.
    }
  }
  if (!reviewId && !mountainId) return badRequest("id 또는 mountainId 가 필요해요.");

  // RLS 로 user_id 는 자동 제한되지만, 명시적으로도 스코프해 이중 안전.
  let query = supabase.from("reviews").delete().eq("user_id", userId);
  query = reviewId ? query.eq("id", reviewId) : query.eq("mountain_id", mountainId as string);
  const { error } = await query;

  if (error) {
    return NextResponse.json(
      { status: "error", error: "후기를 삭제하지 못했어요." },
      { status: 500 },
    );
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
