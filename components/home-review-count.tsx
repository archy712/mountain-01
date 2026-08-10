import Link from "next/link";
import { connection } from "next/server";
import { MessageSquare } from "lucide-react";

import { getReviewCountForMountain } from "@/lib/data/reviews";

/**
 * 홈 산 카드의 후기 수 배지 — 카드별 독립 스트리밍 (Task 048 후속).
 *
 * 후기가 1개 이상일 때만 "후기 N" 배지를 렌더하고, 클릭하면 해당 산 상세의 후기 섹션
 * (`/mountains/{id}#reviews`)으로 이동한다. 후기 수는 사용자 작성물이라 매번 최신을 보여야
 * 하므로 `connection()` 으로 동적 홀임을 명시한다(컨디션 칩과 동일한 카드별 스트리밍 패턴).
 *
 * 카드 전체는 상세 상단으로 가는 stretched-link 이고, 이 배지는 그 위에 겹쳐 별도 링크로
 * 동작한다(`pointer-events-auto` + z-index). 중첩 앵커가 아니라 형제 앵커라 마크업이 유효하다.
 */
export async function HomeReviewCount({ mountainId }: { mountainId: string }) {
  await connection();
  const count = await getReviewCountForMountain(mountainId);
  if (count <= 0) return null;

  return (
    <Link
      href={`/mountains/${mountainId}#reviews`}
      aria-label={`후기 ${count}개 보기`}
      className="pointer-events-auto relative z-20 mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
    >
      <MessageSquare className="size-3" aria-hidden="true" />
      후기 {count}
    </Link>
  );
}
