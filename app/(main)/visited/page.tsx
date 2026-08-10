import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { VisitedList, type VisitedItem } from "@/components/visited-list";
import { VisitedListSkeleton } from "@/components/visited-list-skeleton";
import { VisitedStats, VisitedStatsSkeleton } from "@/components/visited-stats";
import { computeVisitedStats, type VisitedStatsRow } from "@/lib/data/visited-stats";
import { createClient } from "@/lib/supabase/server";

/**
 * 방문완료 화면 (Task 037). 즐겨찾기(`/favorites`)와 동일한 보호 라우트·이중 방어 패턴.
 *
 * proxy.ts 가 비로그인 요청을 `/auth/login?next=/visited` 로 보내고, 이 서버 컴포넌트가
 * `getClaims()` 로 **이중 방어**한다. 목록은 RLS 로 본인 행만 조회된다.
 *
 * 즐겨찾기와 달리 컨디션 점수(외부 API)를 노출하지 않는다 — 방문 "기록"이므로 산 메타 +
 * 방문일만 즉시 렌더한다(카드별 점수 스트리밍 불필요). visited_at 내림차순 정렬.
 */

type VisitedMountain = {
  id: string;
  name: string;
  region: string;
  altitude: number | null;
  is_top100: boolean;
};

type VisitedRow = {
  mountain_id: string;
  visited_at: string;
  mountains: VisitedMountain | null;
};

/** 방문일을 KST "YYYY.MM.DD" 로 포맷(서버/클라 타임존 불일치 방지). */
const visitedDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatVisitedLabel(iso: string): string {
  // ko-KR 2-digit → "2026. 08. 09." → 점 표기로 정돈.
  return visitedDateFormatter.format(new Date(iso)).replace(/\.\s?/g, ".").replace(/\.$/, "");
}

/**
 * 방문한 산 메타 + 방문일을 조회한다(DB 전용, 빠름). visited_at 내림차순.
 * 한 번의 조회로 목록 카드(items)와 통계 집계 입력(statsRows)을 함께 만든다.
 * `is_top100` 임베드로 100대명산 진척을 별도 쿼리 없이 산출한다(Task 040).
 */
async function loadVisited(): Promise<{ items: VisitedItem[]; statsRows: VisitedStatsRow[] }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visited")
    .select("mountain_id, visited_at, mountains(id, name, region, altitude, is_top100)")
    .order("visited_at", { ascending: false });

  const rows = ((data ?? []) as VisitedRow[]).filter(
    (r): r is VisitedRow & { mountains: VisitedMountain } => r.mountains !== null,
  );

  const items: VisitedItem[] = rows.map((r) => ({
    mountainId: r.mountains.id,
    name: r.mountains.name,
    region: r.mountains.region,
    altitude: r.mountains.altitude,
    visitedLabel: formatVisitedLabel(r.visited_at),
  }));

  const statsRows: VisitedStatsRow[] = rows.map((r) => ({
    visitedAt: r.visited_at,
    region: r.mountains.region,
    isTop100: r.mountains.is_top100,
  }));

  return { items, statsRows };
}

/**
 * 세션·목록(요청 데이터) 접근부를 async 컴포넌트로 분리해 `<Suspense>` 로 감싼다
 * (`cacheComponents: true` 규약). 인증 이중 방어를 여기서 수행한다.
 */
async function VisitedContent() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    // proxy 를 우회해 도달한 경우까지 막는 이중 방어(결정 002 #12).
    redirect("/auth/login?next=/visited");
  }

  const { items, statsRows } = await loadVisited();
  const stats = computeVisitedStats(statsRows);

  // 기록이 있을 때만 통계 패널을 노출한다(0건은 목록의 빈 상태 안내가 대신 렌더된다).
  return (
    <div className="flex flex-col gap-6">
      {items.length > 0 ? <VisitedStats stats={stats} /> : null}
      <VisitedList initial={items} />
    </div>
  );
}

export default function VisitedPage() {
  return (
    <section className="flex flex-col gap-6 py-6">
      <h1 className="text-xl font-bold">방문완료</h1>
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <VisitedStatsSkeleton />
            <VisitedListSkeleton />
          </div>
        }
      >
        <VisitedContent />
      </Suspense>
    </section>
  );
}
