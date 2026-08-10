import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { AirUvSummary } from "@/components/air-uv-summary";
import { FireRiskBadge } from "@/components/fire-risk-badge";
import { ConditionScoreGauge } from "@/components/condition-score-gauge";
import { DailyForecastList } from "@/components/daily-forecast-list";
import { BackToListButton } from "@/components/back-to-list-button";
import { FavoriteButton } from "@/components/favorite-button";
import { VisitedButton } from "@/components/visited-button";
import { MountainViewTracker } from "@/components/mountain-view-tracker";
import { FullscreenMapLink } from "@/components/fullscreen-map-link";
import { GearRecommendationList } from "@/components/gear-recommendation-list";
import { HourlyConditionTrend } from "@/components/hourly-condition-trend";
import { HourlyForecastStrip } from "@/components/hourly-forecast-strip";
import { KakaoMap } from "@/components/kakao-map";
import { LoadingBar } from "@/components/loading-bar";
import { MapLegend } from "@/components/map-legend";
import { TrailOverlay } from "@/components/trail-overlay";
import { MountainDetail } from "@/components/mountain-detail";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { ShareButton } from "@/components/share-button";
import { Skeleton } from "@/components/ui/skeleton";
import { SunTimesRow } from "@/components/sun-times-row";
import { TrailList } from "@/components/trail-list";
import { TrailSelectionProvider } from "@/components/trail-selection";
import { WeatherSummaryCard } from "@/components/weather-summary-card";
import { getWeatherForecast } from "@/lib/api/kma-forecast";
import { getConditionForMountain, getConditionTrendForMountain } from "@/lib/condition";
import { getSunTimesToday } from "@/lib/geo/sun-times";
import { getAllMountains } from "@/lib/data/mountains";
import {
  getMountainMeta,
  getTrailPathsForMountain,
  getTrailsForMountain,
} from "@/lib/data/mountain-detail";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { hasData, type Mountain, type PartialResult, type WeatherSnapshot } from "@/lib/types";

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

  // 공유 시 링크 프리뷰(OG)를 산별로 제공한다(Task 041). metadataBase(app/layout.tsx)가
  // 상대 URL 을 절대 URL 로 해석한다.
  const title = `${mountain.name} 날씨·탐방로`;
  const description = `${mountain.name}(${mountain.region})의 오늘 날씨·탐방로 개방 여부·등산 컨디션을 확인하세요.`;
  const url = `/mountains/${mountain.id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | 산길정보`,
      description,
      url,
      type: "article",
    },
  };
}

export default async function MountainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mountain = await getMountainMeta(id);

  if (!mountain) notFound();

  return (
    <div className="space-y-6 py-6">
      <MountainViewTracker mountainId={mountain.id} />
      <BackToListButton />
      <MountainDetail
        mountain={mountain}
        action={
          <div className="flex items-center gap-1.5">
            {/* 공유는 세션과 무관하므로 정적 셸에서 즉시 렌더한다(스트리밍 대기 불필요, Task 041). */}
            <ShareButton mountainId={mountain.id} mountainName={mountain.name} />
            <Suspense
              fallback={
                <div className="flex items-center gap-1.5">
                  <Skeleton className="size-11 rounded-full" />
                  <Skeleton className="size-11 rounded-full" />
                </div>
              }
            >
              <DetailActions mountainId={mountain.id} />
            </Suspense>
          </div>
        }
      />

      <Suspense fallback={<ConditionSectionSkeleton />}>
        <ConditionSection mountain={mountain} />
      </Suspense>

      {/* "지금 갈 만한가"(위 히어로)를 "오늘 언제 가면 좋은가"로 확장(Task 039).
          시간대별 컨디션 추이를 독립 스트리밍한다. */}
      <Suspense fallback={<ConditionTrendSkeleton />}>
        <ConditionTrendSection mountain={mountain} />
      </Suspense>

      <Suspense fallback={<WeatherCardSkeleton />}>
        <WeatherSection mountain={mountain} />
      </Suspense>

      {/* 탐방로 목록 ↔ 지도 폴리라인 선택 연동(Task 032). 두 섹션을 한 Provider 로 감싸
          목록 클릭 시 지도의 해당 선을 강조색으로 부각한다(반대 방향도 동작). */}
      <TrailSelectionProvider>
        <Suspense fallback={<TrailListSkeleton />}>
          <TrailSection mountainId={mountain.id} />
        </Suspense>

        {/* 지도 섹션 — 카카오맵(Task 028) + 등산로 폴리라인(Task 029) + 선택 강조(Task 032).
            id 는 목록에서 코스 선택 시 지도로 스크롤하는 앵커로 쓰인다(Task 033 #1). */}
        <section
          id="trail-map-section"
          aria-labelledby="map-heading"
          className="scroll-mt-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 id="map-heading" className="text-base font-semibold">
              지도
            </h2>
            {/* 선택한 코스를 ?trail= 로 전달해 전체화면에서 복원한다(Task 033 후속). */}
            <FullscreenMapLink mountainId={id} />
          </div>
          <div className="relative overflow-hidden rounded-lg border">
            <KakaoMap
              lat={mountain.lat}
              lng={mountain.lng}
              name={mountain.name}
              appKey={publicEnv.kakaoMapKey}
              className="h-[220px]"
            >
              <Suspense fallback={null}>
                <TrailOverlaySection mountainId={mountain.id} />
              </Suspense>
            </KakaoMap>
            <MapLegend
              statuses={["open", "partial", "closed"]}
              className="absolute right-3 bottom-3 left-3 sm:right-auto"
            />
          </div>
        </section>
      </TrailSelectionProvider>
    </div>
  );
}

/**
 * 우측 상단 액션 스트리밍 서브트리(즐겨찾기 + 방문완료). 로그인 여부(요청별 세션)에 따라
 * 저장/로그인 유도 UX 가 갈리므로 정적 셸에 끌려 들어가지 않도록 별도 <Suspense> 홀로
 * 분리한다. 세션 확인 1회 뒤 두 상태(즐겨찾기·방문완료)를 병렬 조회한다(Task 026·037).
 */
async function DetailActions({ mountainId }: { mountainId: string }) {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  let initialFavorite = false;
  let initialVisited = false;
  if (userId) {
    // RLS 로 본인 행만 조회되므로 user_id 필터는 이중 안전용. 두 조회를 병렬 실행한다.
    const [{ data: fav }, { data: vis }] = await Promise.all([
      supabase
        .from("favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("mountain_id", mountainId)
        .maybeSingle(),
      supabase
        .from("visited")
        .select("id")
        .eq("user_id", userId)
        .eq("mountain_id", mountainId)
        .maybeSingle(),
    ]);
    initialFavorite = Boolean(fav);
    initialVisited = Boolean(vis);
  }

  return (
    <div className="flex items-center gap-1.5">
      <VisitedButton
        mountainId={mountainId}
        initialVisited={initialVisited}
        isAuthenticated={Boolean(userId)}
      />
      <FavoriteButton
        mountainId={mountainId}
        initialFavorite={initialFavorite}
        isAuthenticated={Boolean(userId)}
      />
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
    region: mountain.region,
  });

  if (!hasData(result)) return null;
  const { score, gear, air, uv, fire, factors } = result.data;

  // 게이지 자체가 `aria-labelledby` 로 라벨된 섹션이라, 래퍼는 랜드마크·제목을 중복하지
  // 않도록 순수 스타일 컨테이너(div)로 둔다. 감점 근거 아래에 대기질·자외선 실수치를
  // 노출해 "왜 이 점수인지"를 뒷받침하고(Task 034), 장비 추천을 이어 붙인다.
  return (
    <div className="space-y-4 rounded-lg border p-5">
      <ConditionScoreGauge condition={score} />
      <ScoreBreakdown factors={factors} />
      {fire ? <FireRiskBadge fire={fire} className="border-t pt-4" /> : null}
      {air || uv ? <AirUvSummary air={air} uv={uv} className="border-t pt-4" /> : null}
      <GearRecommendationList gear={gear} />
    </div>
  );
}

/**
 * 시간대별 컨디션 추이 스트리밍 서브트리 (Task 039). 확장 예보(시간별) + 대기질·자외선을
 * 병렬 조회해 슬롯별 점수를 낸다. 세 소스 모두 `ConditionSection`·`WeatherSection` 과 동일한
 * 캐시 키를 재사용하므로 추가 네트워크가 없다. 예보 자체가 없으면(추이 불가) 섹션을 숨긴다
 * (날씨 카드가 별도로 실패를 안내). 매 요청 달라지는 동적 데이터라 connection() 명시.
 */
async function ConditionTrendSection({ mountain }: { mountain: Mountain }) {
  await connection();
  const result = await getConditionTrendForMountain({
    id: mountain.id,
    gridNx: mountain.gridNx,
    gridNy: mountain.gridNy,
    lat: mountain.lat,
    lng: mountain.lng,
    region: mountain.region,
  });

  if (!hasData(result) || result.data.points.length === 0) return null;
  return (
    <div className="rounded-lg border p-5">
      <HourlyConditionTrend trend={result.data} />
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
  const result = await getWeatherForecast(mountain.id, {
    nx: mountain.gridNx,
    ny: mountain.gridNy,
  });

  // 카드는 현재 스냅샷 + stale/에러 UX 를 그대로 재사용한다(예보→스냅샷 결과 매핑).
  const currentResult: PartialResult<WeatherSnapshot> = !hasData(result)
    ? result
    : result.status === "stale"
      ? {
          status: "stale",
          data: result.data.current,
          fetchedAt: result.fetchedAt,
          error: result.error,
        }
      : { status: "success", data: result.data.current, fetchedAt: result.fetchedAt };

  // 일출·일몰은 위경도+오늘(KST)로 계산한다(외부 API 불필요, connection() 로 동적 홀 명시됨).
  const sun = getSunTimesToday(mountain.lat, mountain.lng);

  // 날씨 섹션에 접근성용 제목을 부여해 스크린리더 제목 위계를 정돈한다(Task 033):
  // 히어로(큰 기온)가 시각적 제목 역할을 하므로 sr-only 로 두고, 하위 시간대별/3일예보(h3)가
  // 이 h2 아래로 올바르게 중첩되게 한다.
  return (
    <section aria-labelledby="weather-heading" className="space-y-4">
      <h2 id="weather-heading" className="sr-only">
        오늘 날씨
      </h2>
      <WeatherSummaryCard result={currentResult} />
      <SunTimesRow sun={sun} />
      {hasData(result) ? (
        <>
          <HourlyForecastStrip items={result.data.hourly} />
          <DailyForecastList items={result.data.daily} />
        </>
      ) : null}
    </section>
  );
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

/**
 * 등산로 폴리라인 오버레이 서브트리 (Task 029). `path_geojson` 이 있는 국립공원 산만
 * 폴리라인을 그리고, 미보유 산은 빈 배열 → 마커+목록 폴백만 유지된다. 오늘 실효 상태로
 * 색을 칠하므로 매 요청 달라질 수 있어 `connection()` 으로 동적 홀임을 명시한다. `KakaoMap`
 * 의 children 으로 렌더되어 지도 준비 후 컨텍스트 핸들로 그려진다.
 */
async function TrailOverlaySection({ mountainId }: { mountainId: string }) {
  await connection();
  const paths = await getTrailPathsForMountain(mountainId);
  if (paths.length === 0) return null;
  return <TrailOverlay trails={paths} />;
}

/**
 * 컨디션 점수 섹션 스트리밍 대기용 스켈레톤.
 *
 * 콜드 캐시(스태거드 스트리밍)에서 스켈레톤보다 실제 콘텐츠가 크면 아래 섹션을 밀어내
 * 큰 CLS 가 발생한다(Task 032). 이를 막기 위해 실제 구조(게이지 → 등급/메시지 →
 * 감점 근거 → 대기·자외선 3타일 → 장비 목록)를 그대로 반영해 높이(~760px)를 예약한다.
 */
function ConditionSectionSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border p-5" aria-busy="true">
      <LoadingBar />
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-[168px] rounded-full" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>
      {/* 점수 근거 카드(전체 요인 5행 + 요약) */}
      <div className="space-y-2.5 rounded-lg border p-4">
        <Skeleton className="h-5 w-20" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
        <Skeleton className="h-4 w-3/4" />
      </div>
      {/* 대기질·자외선 3타일 패널 */}
      <div className="grid grid-cols-3 gap-2 border-t pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
        ))}
      </div>
      {/* 장비 추천 목록 */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-[116px] w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * 시간대별 컨디션 추이 스트리밍 대기용 스켈레톤 (Task 039).
 *
 * 실제 섹션은 제목 행 + 막대 8개(점수·막대·라벨·마커)로 구성된다. 콜드 스트리밍에서
 * 아래 섹션을 밀어내지 않도록 실제 구조·높이를 예약한다(CLS 회피, Task 032).
 */
function ConditionTrendSkeleton() {
  return (
    <div className="rounded-lg border p-5" aria-busy="true">
      <LoadingBar className="mb-4" />
      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-end gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] w-11 rounded-md" />
        ))}
      </div>
    </div>
  );
}

/**
 * 날씨 섹션 스트리밍 대기용 스켈레톤.
 *
 * 실제 날씨 섹션은 요약 카드 + 일출·일몰 + 시간대별 스트립 + 3일 예보로 구성돼 ~600px 다.
 * 스켈레톤이 요약 카드만 덮으면 콜드 스트리밍에서 나머지가 아래를 밀어내 CLS 를 유발하므로
 * (Task 032) 전체 구조의 높이를 예약한다.
 */
function WeatherCardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="rounded-lg border p-5">
        <LoadingBar className="mb-4" />
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
      {/* 일출·일몰 행 */}
      <Skeleton className="h-14 w-full rounded-lg" />
      {/* 시간대별 스트립(가로 스크롤) */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-[116px] w-full rounded-lg" />
      </div>
      {/* 3일 예보 */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-[120px] w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * 탐방로 목록 스트리밍 대기용 스켈레톤.
 *
 * 실제 목록은 코스 요약 바 + 코스 행(가변)으로 구성된다. 하단(지도 위)이라 CLS 가중치는
 * 상단 섹션보다 낮지만, 요약 바 + 대표적인 행 수를 예약해 지도가 밀리지 않게 한다(Task 032).
 */
function TrailListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <LoadingBar />
      <Skeleton className="h-5 w-20" />
      {/* 코스 요약 바 */}
      <Skeleton className="h-16 w-full rounded-lg" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
