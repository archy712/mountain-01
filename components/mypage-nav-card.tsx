import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";

/**
 * 마이페이지 진입 카드 (Task 038). 즐겨찾기·방문완료 등 개인화 화면으로 직결하며,
 * 우측에 개수 배지를 노출한다. 아이콘·라벨·설명·개수·링크만 받는 순수 표현 컴포넌트라
 * 앞으로 개인화 화면이 늘어도 그대로 재사용한다. 44px 터치 타깃을 보장한다.
 */
export function MypageNavCard({
  href,
  icon: Icon,
  label,
  description,
  count,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  /** 항목 개수(배지). null 이면 배지를 숨긴다(집계 실패 등). */
  count: number | null;
}) {
  return (
    <Link href={href} className="block">
      <Card className="flex min-h-11 items-center gap-3 p-4 shadow-sm transition-colors hover:bg-accent">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-semibold tracking-tight">{label}</span>
            {count !== null ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                {count}
              </span>
            ) : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{description}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Card>
    </Link>
  );
}
