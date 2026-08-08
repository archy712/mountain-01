import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Maximize2 } from "lucide-react";

import { ConditionScoreGauge } from "@/components/condition-score-gauge";
import { GearRecommendationList } from "@/components/gear-recommendation-list";
import { MapLegend } from "@/components/map-legend";
import { MountainDetail } from "@/components/mountain-detail";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { Skeleton } from "@/components/ui/skeleton";
import { TrailList } from "@/components/trail-list";
import { WeatherSummaryCard } from "@/components/weather-summary-card";
import { getWeatherSnapshot } from "@/lib/api/kma-forecast";
import { getConditionForMountain } from "@/lib/condition";
import { getAllMountains } from "@/lib/data/mountains";
import { getMountainMeta, getTrailsForMountain } from "@/lib/data/mountain-detail";
import { hasData, type Mountain } from "@/lib/types";

/**
 * 산 마스터(고정 30종 시드)를 정적 파라미터로 프리렌더한다.
 * - cacheComponents 규약: `dynamicParams` 미지원 → 알 수 없는 id 는 page 의 notFound() 로 처리.
 * - 정적 셸(메타·지도 자리)을 프리렌더해 LCP 를 낮추고(Task 020), params 가 정적이라
 *   top-level 존재 검사→notFound() 가 스트리밍 200 이 아닌 **진짜 404** 를 낼 수 있다.
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  const mountains = await getAllMountains();
  return mountains.map((m) => ({ id: m.id }));
}

/**
 * 산 상세 결과 화면 — 실데이터 연동 (Task 019, Phase 3 / 1단계 MVP).
 *
 * "결론 우선" 위계: 산 식별(메타) → 오늘 날씨 → 탐방로 → 지도. 스크롤 없이
 * "지금 이 산에 가도 되는지"를 판단하게 한다.
 *
 * 스트리밍: 산 메타를 먼저 확정(없으면 notFound)해 셸을 즉시 그리고, 날씨/탐방로는
 * 각자 <Suspense> 경계로 **독립 스트리밍**한다. 소스별 부분 실패는 각 컴포넌트가
 * `PartialResult`(success/stale/failure)로 격리 렌더하므로, 한쪽이 실패해도 다른
 * 정보는 계속 노출되고 앱은 크래시하지 않는다.
 *
 * 2단계(컨디션 점수·대기질·자외선·장비·즐겨찾기)는 실 API 확립 후 Phase 4
 * (Task 021~024·025)에서 이 페이지에 재통합한다. 지도 폴리라인은 Phase 5(Task 028·029).
 */

/**
 * 산별 문서 제목. 존재하지 않는 산은 notFound() 로 건다(page 의 존재 게이트와 이중 방어).
 * 산 메타는 `getMountainMeta`(`'use cache'`)라 page·generateMetadata 가 한 번만 조회한다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const mountain = await getMountainMeta(id);
  if (!mountain) notFound();
  return { title: `${mountain.name} 날씨·탐방로` };
}

export default async function MountainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mountain = await getMountainMeta(id);

  if (!mountain) notFound();

  return (
    <div className="space-y-6 py-6">
      <MountainDetail mountain={mountain} />

      <Suspense fallback={<ConditionSectionSkeleton />}>
        <ConditionSection mountain={mountain} />
      </Suspense>

      <Suspense fallback={<WeatherCardSkeleton />}>
        <WeatherSection mountain={mountain} />
      </Suspense>

      <Suspense fallback={<TrailListSkeleton />}>
        <TrailSection mountainId={mountain.id} />
      </Suspense>

      {/* 지도 섹션 자리표시자 — 카카오맵·폴리라인은 Task 028·029(Phase 5) */}
      <section aria-labelledby="map-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="map-heading" className="text-base font-semibold">
            지도
          </h2>
          <Link
            href={`/mountains/${id}/map`}
            className="inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Maximize2 className="size-4" aria-hidden="true" />
            전체화면
          </Link>
        </div>
        <div className="relative overflow-hidden rounded-lg border">
          <div className="flex min-h-[200px] items-center justify-center bg-muted/40 px-4 text-center text-sm text-muted-foreground">
            카카오맵과 등산로가 이 자리에 표시됩니다. (Task 028·029)
          </div>
          <MapLegend
            statuses={["open", "partial", "closed"]}
            className="absolute right-3 bottom-3 left-3 sm:right-auto"
          />
        </div>
      </section>
    </div>
  );
}

/**
 * 컨디션 점수 스트리밍 서브트리 — "결론 우선" 히어로. 날씨·대기질·자외선을 병렬 조회해
 * 0~100 점수·등급·감점 근거를 계산한다(Task 023). 대기질/자외선 실패는 감점에서 제외되고
 * "일부 데이터 제외" 배지로 투명하게 고지된다. 날씨 자체가 사용 불가면 섹션을 숨긴다
 * (날씨 카드가 별도로 실패 상태를 안내). 매 요청 달라지는 동적 데이터라 connection() 명시.
 */
async function ConditionSection({ mountain }: { mountain: Mountain }) {
  await connection();
  const result = await getConditionForMountain({
    id: mountain.id,
    gridNx: mountain.gridNx,
    gridNy: mountain.gridNy,
    lat: mountain.lat,
    lng: mountain.lng,
  });

  if (!hasData(result)) return null;
  const { score, gear } = result.data;

  // 게이지 자체가 `aria-labelledby` 로 라벨된 섹션이라, 래퍼는 랜드마크·제목을 중복하지
  // 않도록 순수 스타일 컨테이너(div)로 둔다. 장비 추천은 점수 근거 아래에 이어 붙인다.
  return (
    <div className="space-y-4 rounded-lg border p-5">
      <ConditionScoreGauge condition={score} />
      <ScoreBreakdown condition={score} />
      <GearRecommendationList gear={gear} />
    </div>
  );
}

/**
 * 날씨 스트리밍 서브트리. 격자 좌표로 오늘 스냅샷을 조회한다(실패는 카드가 폴백).
 * 날씨는 발표시각·외부 API 로 **매 요청 달라지는 동적 데이터**라, 정적 셸 프리렌더에
 * 끌려 들어가지 않도록 `connection()` 으로 동적 홀임을 명시한다(현재 시각 사용 허용).
 */
async function WeatherSection({ mountain }: { mountain: Mountain }) {
  await connection();
  const result = await getWeatherSnapshot(mountain.id, {
    nx: mountain.gridNx,
    ny: mountain.gridNy,
  });
  return <WeatherSummaryCard result={result} />;
}

/**
 * 탐방로 스트리밍 서브트리. 오늘(KST) 기준 실효 상태를 계산해 목록을 그린다.
 * "오늘"이 매 요청 달라지므로 `connection()` 으로 동적 홀임을 명시한다.
 */
async function TrailSection({ mountainId }: { mountainId: string }) {
  await connection();
  const result = await getTrailsForMountain(mountainId);
  return <TrailList result={result} />;
}

/** 컨디션 점수 섹션 스트리밍 대기용 스켈레톤(게이지 원형 + 근거 카드). */
function ConditionSectionSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border p-5" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-[168px] rounded-full" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

/** 날씨 카드 스트리밍 대기용 스켈레톤(CLS 최소화). */
function WeatherCardSkeleton() {
  return (
    <div className="rounded-lg border p-5" aria-busy="true">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** 탐방로 목록 스트리밍 대기용 스켈레톤. */
function TrailListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="h-5 w-20" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border p-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
