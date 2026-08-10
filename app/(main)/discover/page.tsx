import { Suspense } from "react";
import type { Metadata } from "next";

import { LoadingBar } from "@/components/loading-bar";
import { MountainRecommend } from "@/components/mountain-recommend";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecommendMountains } from "@/lib/data/recommend";

export const metadata: Metadata = {
  title: "산 추천",
  description: "지역·고도·난이도로 오늘 갈 산을 골라보세요. 산길정보의 필터형 산 추천.",
};

/**
 * 산 추천 화면 (Task 042).
 *
 * 신규 외부 소스 없이 보유 데이터(지역·고도 + 코스 오름시간 파생 난이도)만으로 "이런 산
 * 어때요?" 필터형 추천을 제공한다. 홈의 "결론 우선" 검색 위계를 해치지 않도록 100대명산
 * (`/top100`)처럼 별도 라우트로 분리한다. 후보 목록은 near-immutable 이라 `'use cache'`
 * (mountains 프로필)로 캐시하고, 필터/정렬은 클라이언트(`MountainRecommend`)가 담당한다.
 */
export default function DiscoverPage() {
  return (
    <div className="space-y-6 pt-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">산 추천</h1>
        <p className="text-sm text-muted-foreground">
          지역·고도·난이도로 골라 오늘 갈 산을 찾아보세요.
        </p>
      </header>

      <Suspense fallback={<DiscoverSkeleton />}>
        <DiscoverContent />
      </Suspense>
    </div>
  );
}

async function DiscoverContent() {
  const mountains = await getRecommendMountains();
  return <MountainRecommend mountains={mountains} />;
}

function DiscoverSkeleton() {
  return (
    <section aria-busy="true" className="space-y-4">
      <span role="status" className="sr-only">
        산 추천 목록을 불러오는 중입니다…
      </span>
      <LoadingBar />
      <div aria-hidden="true" className="space-y-4">
        {/* 필터 칩 자리(지역·고도·난이도 3줄) */}
        {Array.from({ length: 3 }).map((_, row) => (
          <div key={row} className="flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-16 shrink-0 rounded-full" />
            ))}
          </div>
        ))}
        {/* 정렬 자리 */}
        <Skeleton className="h-10 w-64 rounded-lg" />
        {/* 카드 그리드 자리 */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}
