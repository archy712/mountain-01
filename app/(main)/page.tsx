import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Mountain as MountainIcon } from "lucide-react";

import { HomeConditionsSkeleton } from "@/components/home-conditions-skeleton";
import { HomeFavoriteConditions } from "@/components/home-favorite-conditions";
import { MountainSearchInput } from "@/components/mountain-search-input";
import { RecentSearches } from "@/components/recent-searches";
import { TodayConditionPicks } from "@/components/today-condition-picks";
import { Card } from "@/components/ui/card";

/**
 * 홈/검색 화면 (Task 009 → Task 018 실데이터 → 컨디션 중심 재구성).
 *
 * "결론 우선" 진입점: 산 이름 하나로 상세로 직행하되, 검색 전에도 **판단 신호(컨디션 점수)**
 * 를 미리 보여준다. 위계는 검색 → 개인화(내 산 컨디션) → 최근 검색 → 지금 갈 만한 산 →
 * 100대명산 순이다. 각 컨디션 블록은 외부 API(날씨·대기·자외선)에 기대므로 독립 `<Suspense>`
 * 로 스트리밍해 히어로·검색이 먼저 그려지게 한다.
 *
 * - `HomeFavoriteConditions`: 로그인 + 즐겨찾기가 있을 때만 노출(없으면 유도/숨김).
 * - `TodayConditionPicks`: 후보 풀의 오늘 컨디션을 계산해 **점수순**으로 상위 4곳(모든 사용자).
 */
export default function HomePage() {
  return (
    <div className="space-y-8 pt-8">
      <section className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">지금 이 산에 가도 될까?</h1>
        <p className="text-sm text-muted-foreground">
          산 이름 하나로 오늘 날씨·탐방로·컨디션을 3초 안에.
        </p>
      </section>

      <MountainSearchInput />

      {/* 개인화: 로그인+즐겨찾기일 때만 내용이 있고, 아니면 스스로 null/유도로 접힌다. */}
      <Suspense fallback={<HomeConditionsSkeleton cards={3} />}>
        <HomeFavoriteConditions />
      </Suspense>

      <RecentSearches />

      <Suspense fallback={<HomeConditionsSkeleton cards={4} />}>
        <TodayConditionPicks />
      </Suspense>

      <Link href="/top100" className="block">
        <Card className="flex min-h-11 items-center gap-3 p-4 shadow-sm transition-colors hover:bg-accent">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <MountainIcon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold tracking-tight">100대명산 둘러보기</span>
            <span className="block text-xs text-muted-foreground">
              산림청 선정 100대명산을 지역·고도로 탐색
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Card>
      </Link>
    </div>
  );
}
