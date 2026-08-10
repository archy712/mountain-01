import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { KakaoMap } from "@/components/kakao-map";
import { FacilityMarkers } from "@/components/facility-markers";
import { MapLegend } from "@/components/map-legend";
import { TrailOverlay } from "@/components/trail-overlay";
import { TrailSelectionProvider } from "@/components/trail-selection";
import { TrailSelectionUrlSync } from "@/components/trail-selection-url-sync";
import { getAllMountains } from "@/lib/data/mountains";
import { getFacilitiesForMountain } from "@/lib/data/facilities";
import { getMountainMeta, getTrailPathsForMountain } from "@/lib/data/mountain-detail";
import { publicEnv } from "@/lib/env";

/**
 * 전체화면 지도 화면 (Task 012 골격 → Task 028 KakaoMap → Task 029 폴리라인 오버레이).
 *
 * 지도 셸(타일·마커)은 정적 프리렌더로 즉시 그리고, 등산로 폴리라인은 오늘 실효 상태로
 * 색을 칠하므로 `<Suspense>` + `connection()` 동적 홀로 스트리밍한다.
 *
 * `[id]` 세그먼트를 부모 상세와 함께 정적 프리렌더하고(존재하지 않는 산은 notFound→404),
 * 산 이름은 캐시된 `getMountainMeta` 로 가져온다. params 는 비동기(Next.js 16).
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  const mountains = await getAllMountains();
  return mountains.map((m) => ({ id: m.id }));
}

/** 전체화면 지도의 등산로 폴리라인 오버레이(오늘 실효 상태 색상). GeoJSON 미보유 산은 null. */
async function FullscreenTrailOverlay({ mountainId }: { mountainId: string }) {
  await connection();
  const paths = await getTrailPathsForMountain(mountainId);
  if (paths.length === 0) return null;
  return <TrailOverlay trails={paths} />;
}

/** 전체화면 지도의 편의시설 마커(화장실·대피소, Task 045). 정적 캐시 데이터, 미보유 산은 null. */
async function FullscreenFacilityMarkers({ mountainId }: { mountainId: string }) {
  const facilities = await getFacilitiesForMountain(mountainId);
  if (facilities.length === 0) return null;
  return <FacilityMarkers facilities={facilities} />;
}

export default async function MountainMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mountain = await getMountainMeta(id);
  if (!mountain) notFound();
  const title = `${mountain.name} 지도`;

  return (
    <section className="flex flex-col gap-3 py-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/mountains/${id}`}
          aria-label="상세로 돌아가기"
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="text-lg font-bold">{title}</h1>
      </div>

      {/* 풀스크린 지도 영역 (Task 028: KakaoMap, Task 029: 폴리라인, Task 032: 선택 강조).
          목록이 없는 화면이라 폴리라인 클릭 → 강조 + 이름 라벨로 코스를 식별한다. */}
      <TrailSelectionProvider>
        {/* 상세에서 넘어온 ?trail= 선택을 복원한다. useSearchParams 사용을 이 컴포넌트에
            국한하고 <Suspense> 로 감싸 지도 셸의 정적 프리렌더를 유지한다(Task 033 후속). */}
        <Suspense fallback={null}>
          <TrailSelectionUrlSync />
        </Suspense>
        <div className="relative overflow-hidden rounded-lg border">
          <KakaoMap
            lat={mountain.lat}
            lng={mountain.lng}
            name={mountain.name}
            level={5}
            appKey={publicEnv.kakaoMapKey}
            className="min-h-[70dvh]"
          >
            <Suspense fallback={null}>
              <FullscreenTrailOverlay mountainId={mountain.id} />
            </Suspense>
            <Suspense fallback={null}>
              <FullscreenFacilityMarkers mountainId={mountain.id} />
            </Suspense>
          </KakaoMap>
          <MapLegend
            statuses={["open", "partial", "closed"]}
            facilities={["toilet", "shelter"]}
            className="absolute right-3 bottom-3 left-3 sm:right-auto"
          />
        </div>
      </TrailSelectionProvider>
    </section>
  );
}
