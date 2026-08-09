import { Suspense } from "react";
import type { Metadata } from "next";

import { LoadingBar } from "@/components/loading-bar";
import { Top100List } from "@/components/top100-list";
import { Skeleton } from "@/components/ui/skeleton";
import { getTop100Mountains } from "@/lib/data/mountains";

export const metadata: Metadata = {
  title: "100대명산",
  description:
    "산림청이 선정한 대한민국 100대명산을 지역·고도별로 둘러보고 오늘 컨디션을 확인하세요.",
};

/**
 * 100대명산 목록 화면 (Task 036).
 *
 * 산림청 선정 100대명산 전용 콘텐츠 라우트. 홈의 "결론 우선" 검색 위계를 해치지 않도록
 * 별도 라우트로 분리한다. 목록은 거의 불변이라 `'use cache'`(mountains 프로필)로 캐시하고,
 * 지역 필터·고도 정렬은 클라이언트(`Top100List`)가 담당한다.
 */
export default function Top100Page() {
  return (
    <div className="space-y-6 pt-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">100대명산</h1>
        <p className="text-sm text-muted-foreground">
          산림청이 선정한 대한민국 100대명산. 지역·고도로 골라 오늘 갈 산을 찾아보세요.
        </p>
      </header>

      <Suspense fallback={<Top100Skeleton />}>
        <Top100Content />
      </Suspense>
    </div>
  );
}

async function Top100Content() {
  const mountains = await getTop100Mountains();
  return <Top100List mountains={mountains} />;
}

function Top100Skeleton() {
  return (
    <section aria-busy="true" className="space-y-4">
      <span role="status" className="sr-only">
        100대명산 목록을 불러오는 중입니다…
      </span>
      <LoadingBar />
      <div aria-hidden="true" className="space-y-4">
        {/* 지역 필터 칩 자리 */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-16 shrink-0 rounded-full" />
          ))}
        </div>
        {/* 정렬 자리 */}
        <Skeleton className="h-10 w-56 rounded-lg" />
        {/* 카드 그리드 자리 */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}
