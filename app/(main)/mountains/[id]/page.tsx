import Link from "next/link";
import { notFound } from "next/navigation";
import { Maximize2 } from "lucide-react";

import { AirQualityBadge } from "@/components/air-quality-badge";
import { ConditionScoreGauge } from "@/components/condition-score-gauge";
import { FavoriteButton } from "@/components/favorite-button";
import { GearRecommendationList } from "@/components/gear-recommendation-list";
import { MapLegend } from "@/components/map-legend";
import { MountainDetail } from "@/components/mountain-detail";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { TrailList } from "@/components/trail-list";
import { UvIndexBadge } from "@/components/uv-index-badge";
import { WeatherSummaryCard } from "@/components/weather-summary-card";
import { getMockMountainDetail } from "@/lib/mock";
import { hasData } from "@/lib/types";

/**
 * 산 상세 결과 화면 (Task 010 1단계 + Task 011 2단계).
 *
 * "결론 우선" 위계: 산 식별(메타) → **컨디션 점수(히어로 결론)** → 근거(감점·날씨·
 * 대기/자외선) → 추천 장비 → 탐방로. 스크롤 없이 오늘 산행 가부를 판단하게 한다.
 *
 * 현재는 더미(`getMockMountainDetail`). 실데이터 연동·`notFound()` 정식 처리는 Task 019.
 * 소스별 부분 실패는 각 컴포넌트가 격리 렌더하고, 대기질 측정소 부재(결정 001 #5)는
 * 아래에서 안내 문구로 대체한다.
 */
export default async function MountainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = getMockMountainDetail(id);

  if (!detail) notFound();

  const condition = detail.condition && hasData(detail.condition) ? detail.condition.data : null;
  const air = detail.air && hasData(detail.air) ? detail.air.data : null;
  const airFailed = detail.air !== undefined && !hasData(detail.air);
  const uv = detail.uv && hasData(detail.uv) ? detail.uv.data : null;
  const gear = detail.gear ?? [];

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-start justify-between gap-3">
        <MountainDetail mountain={detail.mountain} />
        <FavoriteButton className="shrink-0" />
      </div>

      {condition ? (
        <>
          <ConditionScoreGauge condition={condition} />
          <ScoreBreakdown condition={condition} />
        </>
      ) : null}

      <WeatherSummaryCard result={detail.weather} />

      {air || uv || airFailed ? (
        <section aria-labelledby="air-uv-heading" className="space-y-2">
          <h2 id="air-uv-heading" className="text-base font-semibold">
            대기·자외선
          </h2>
          {air ? <AirQualityBadge air={air} /> : null}
          {airFailed ? (
            <p className="text-sm text-muted-foreground">
              인근 측정소가 없어 대기질 정보를 제공하지 못했어요.
            </p>
          ) : null}
          {uv ? <UvIndexBadge uv={uv} /> : null}
        </section>
      ) : null}

      <GearRecommendationList gear={gear} />

      <TrailList result={detail.trails} />

      {/* 지도 섹션 자리표시자 (Task 012) — 카카오맵·폴리라인은 Task 028·029 */}
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
