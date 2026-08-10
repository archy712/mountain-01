/**
 * 후기·별점 서버 데이터 액세스 (Task 048). 서버 전용.
 *
 * 상세 화면 `ReviewSection`(Server Component)이 사용한다. **세션 쿠키 기반 서버 클라이언트**로
 * 조회하므로 RLS 가 적용된다(공개 read = 숨김 제외 + 본인 숨김 포함). 후기는 사용자 작성물이라
 * 매번 최신을 보여야 하고 본인 숨김 가시성도 세션 의존이라 `'use cache'` 하지 않는다(섹션이
 * `connection()` 으로 동적 스트리밍).
 *
 * 리뷰어 표시명은 작성 시점 스냅샷(`author_name`)을 쓴다 — `profiles` 는 본인만 조회 RLS 라
 * 타인 이름을 조인할 수 없기 때문(작성 시 API 가 본인 프로필에서 스냅샷을 채운다).
 */

import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * 산의 공개 후기 수(숨김 제외)를 반환한다 — 홈 카드 배지용.
 *
 * 뷰어와 무관한 공개 집계라 **쿠키 없는 공개 클라이언트**로 조회한다(anon RLS 로 숨김은
 * 자동 제외되지만 `is_hidden=false` 를 명시해 의도를 분명히 한다). `head:true` 로 행 없이
 * count 만 받는다. 홈 카드가 `connection()` 안에서 호출해 매번 최신 수를 스트리밍한다.
 */
export async function getReviewCountForMountain(mountainId: string): Promise<number> {
  const supabase = createPublicClient();
  const { count, error } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("mountain_id", mountainId)
    .eq("is_hidden", false);
  if (error) return 0;
  return count ?? 0;
}

/** 화면 표현용 후기 1건. */
export interface ReviewView {
  id: string;
  mountainId: string;
  rating: number;
  body: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  isHidden: boolean;
  /** 조회자 본인이 작성한 후기인지(수정/삭제 노출 판단). */
  isOwn: boolean;
}

/**
 * 산의 후기 목록을 최신순으로 반환한다. RLS 로 공개(숨김 제외) 행 + 본인 숨김 행만 온다.
 * @param mountainId 대상 산 id
 * @param viewerId 조회자 user id(없으면 비로그인 → isOwn 은 항상 false)
 */
export async function getReviewsForMountain(
  mountainId: string,
  viewerId: string | null,
): Promise<ReviewView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, mountain_id, rating, body, author_name, created_at, updated_at, is_hidden, user_id",
    )
    .eq("mountain_id", mountainId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    mountainId: r.mountain_id,
    rating: r.rating,
    body: r.body,
    authorName: r.author_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isHidden: r.is_hidden,
    isOwn: viewerId != null && r.user_id === viewerId,
  }));
}

/**
 * 조회자가 이 산을 방문완료(visited)했는지 반환한다 — 후기 작성 자격 판정용.
 * RLS 로 본인 행만 조회되므로 존재 여부만 확인한다. 비로그인이면 false.
 */
export async function hasVisitedMountain(
  mountainId: string,
  viewerId: string | null,
): Promise<boolean> {
  if (!viewerId) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visited")
    .select("id")
    .eq("mountain_id", mountainId)
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return data != null;
}
