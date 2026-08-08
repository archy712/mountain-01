/**
 * 즐겨찾기 CRUD API (Task 026). 로그인 사용자 본인 데이터만 다룬다.
 *
 * 보안: 요청 쿠키 세션으로 만든 서버 클라이언트를 쓰므로 모든 쿼리에 **RLS**가 적용된다
 * (`favorites` 는 `user_id = auth.uid()` 로 select/insert/delete 제한, 결정 003 RLS).
 * user_id 는 클라이언트 입력이 아니라 세션 클레임에서 채워, 타인 행 조작을 원천 차단한다.
 *
 * - POST   { mountainId }  → 추가. `(user_id, mountain_id)` 유니크 충돌은 **멱등 성공** 처리.
 * - DELETE ?mountainId= | { mountainId } → 삭제.
 * 비로그인 요청은 401 JSON(페이지 리다이렉트 아님 — 클라이언트가 로그인 유도).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface FavoriteBody {
  mountainId?: unknown;
}

/** 세션 사용자 id 를 반환(없으면 null). getClaims 관례 사용. */
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

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return unauthorized();

  let body: FavoriteBody;
  try {
    body = (await request.json()) as FavoriteBody;
  } catch {
    return badRequest("요청 형식이 올바르지 않아요.");
  }
  const mountainId = body.mountainId;
  if (typeof mountainId !== "string" || mountainId.length === 0) {
    return badRequest("mountainId 가 필요해요.");
  }

  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: userId, mountain_id: mountainId });

  // 23505: 유니크 위반(이미 즐겨찾기) → 멱등 성공.
  if (error && error.code !== "23505") {
    return NextResponse.json(
      { status: "error", error: "즐겨찾기에 저장하지 못했어요." },
      { status: 500 },
    );
  }

  return NextResponse.json({ status: "ok", data: { favorited: true } }, { status: 200 });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return unauthorized();

  // mountainId 는 쿼리스트링 우선, 없으면 본문에서 읽는다.
  let mountainId = new URL(request.url).searchParams.get("mountainId");
  if (!mountainId) {
    try {
      const body = (await request.json()) as FavoriteBody;
      if (typeof body.mountainId === "string") mountainId = body.mountainId;
    } catch {
      // 본문 없음 — 쿼리스트링만으로 판단.
    }
  }
  if (!mountainId) return badRequest("mountainId 가 필요해요.");

  // RLS 로 user_id 는 자동 제한되지만, 명시적으로도 스코프해 이중 안전.
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("mountain_id", mountainId);

  if (error) {
    return NextResponse.json(
      { status: "error", error: "즐겨찾기를 해제하지 못했어요." },
      { status: 500 },
    );
  }

  return NextResponse.json({ status: "ok", data: { favorited: false } }, { status: 200 });
}
