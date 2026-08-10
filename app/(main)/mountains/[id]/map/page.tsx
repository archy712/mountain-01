import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { KakaoMap } from "@/components/kakao-map";
import { FacilityMarkers } from "@/components/facility-markers";
import { FacilitySelectionProvider } from "@/components/facility-selection";
import { FacilityFilterChips } from "@/components/facility-filter-chips";
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

export default async function MountainMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mountain = await getMountainMeta(id);
  if (!mountain) notFound();
  const title = `${mountain.name} 지도`;

  // 편의시설을 1회 조회해 프로바이더에 올린다(마커·필터칩 공유). 미보유 산은 빈 배열.
  const facilities = await getFacilitiesForMountain(mountain.id);
  const facilityTypes = (["toilet", "shelter", "spring", "shop"] as const).filter((t) =>
    facilities.some((f) => f.type === t),
  );

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
      <FacilitySelectionProvider facilities={facilities}>
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
              {/* 편의시설 아이콘 핀 — 프로바이더의 시설·필터·선택 상태를 구독한다. */}
              <FacilityMarkers />
            </KakaoMap>
            {/* 유형 필터 칩 — 목록이 없는 전체화면에서 마커를 유형별로 좁힌다. z-index 로
                카카오 오버레이(마커·인포윈도우) 위에 띄운다. */}
            <FacilityFilterChips className="absolute top-3 left-3 z-[500] rounded-lg border bg-card/90 p-1.5 shadow-sm backdrop-blur" />
            <MapLegend
              statuses={["open", "partial", "closed"]}
              facilities={facilityTypes.length > 0 ? facilityTypes : undefined}
              className="absolute right-3 bottom-3 left-3 z-[500] sm:right-auto"
            />
          </div>
        </TrailSelectionProvider>
      </FacilitySelectionProvider>
    </section>
  );
}
