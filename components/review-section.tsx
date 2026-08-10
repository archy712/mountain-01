import { connection } from "next/server";

import { Skeleton } from "@/components/ui/skeleton";
import { ReviewsPanel } from "@/components/reviews-panel";
import { createClient } from "@/lib/supabase/server";
import { getReviewsForMountain, hasVisitedMountain } from "@/lib/data/reviews";

/**
 * 후기·별점 섹션 (Task 048). 상세 페이지에서 독립 `<Suspense>` 로 스트리밍한다.
 *
 * 후기는 사용자 작성물이라 매번 최신을 보여야 하고(캐시 안 함), 작성 자격·본인 후기 판정이
 * 세션에 의존하므로 `connection()` 으로 동적 홀임을 명시한다. 세션 확인 1회 뒤 후기 목록과
 * 방문완료 여부를 병렬 조회해 클라이언트 `ReviewsPanel` 에 넘긴다. 표현·상호작용은 패널이 맡는다.
 */
export async function ReviewSection({ mountainId }: { mountainId: string }) {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  const [reviews, hasVisited] = await Promise.all([
    getReviewsForMountain(mountainId, userId),
    hasVisitedMountain(mountainId, userId),
  ]);

  return (
    <section aria-labelledby="review-heading" className="space-y-3">
      <h2 id="review-heading" className="text-base font-semibold">
        등산객 후기
      </h2>
      <ReviewsPanel
        mountainId={mountainId}
        initialReviews={reviews}
        isAuthenticated={Boolean(userId)}
        hasVisited={hasVisited}
      />
    </section>
  );
}

/** 후기 섹션 스켈레톤 — 요약 카드 + 목록 자리(CLS 회피). */
export function ReviewSectionSkeleton() {
  return (
    <section aria-hidden="true" className="space-y-3">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </section>
  );
}
