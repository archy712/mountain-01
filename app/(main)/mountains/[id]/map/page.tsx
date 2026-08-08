import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { KakaoMap } from "@/components/kakao-map";
import { MapLegend } from "@/components/map-legend";
import { getAllMountains } from "@/lib/data/mountains";
import { getMountainMeta } from "@/lib/data/mountain-detail";
import { publicEnv } from "@/lib/env";

/**
 * 전체화면 지도 화면 레이아웃 골격 (Task 012, Task 019 실데이터·404 정합).
 *
 * 카카오맵 SDK 로딩은 `KakaoMap`(Task 028)이 담당한다. 등산로 폴리라인 오버레이는
 * Task 029(Phase 5)에서 얹는다. 여기서는 풀스크린 지도 영역 + 뒤로가기 + 범례 오버레이를 둔다.
 *
 * `[id]` 세그먼트를 부모 상세와 함께 정적 프리렌더하고(존재하지 않는 산은 notFound→404),
 * 산 이름은 캐시된 `getMountainMeta` 로 가져온다(더미 제거). params 는 비동기(Next.js 16).
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  const mountains = await getAllMountains();
  return mountains.map((m) => ({ id: m.id }));
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

      {/* 풀스크린 지도 영역 (Task 028: KakaoMap, Task 029: 폴리라인) */}
      <div className="relative overflow-hidden rounded-lg border">
        <KakaoMap
          lat={mountain.lat}
          lng={mountain.lng}
          name={mountain.name}
          level={5}
          appKey={publicEnv.kakaoMapKey}
          className="min-h-[70dvh]"
        />
        <MapLegend
          statuses={["open", "partial", "closed"]}
          className="absolute right-3 bottom-3 left-3 sm:right-auto"
        />
      </div>
    </section>
  );
}
