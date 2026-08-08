import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Map as MapIcon } from "lucide-react";

import { MapLegend } from "@/components/map-legend";
import { getAllMountains } from "@/lib/data/mountains";
import { getMountainMeta } from "@/lib/data/mountain-detail";

/**
 * 전체화면 지도 화면 레이아웃 골격 (Task 012, Task 019 실데이터·404 정합).
 *
 * 카카오맵 SDK 로딩·등산로 폴리라인 오버레이는 Phase 5(Task 028·029)에서 구현한다.
 * 여기서는 풀스크린 지도 영역 + 뒤로가기 + 범례 오버레이의 마크업 골격만 둔다.
 * (엣지-투-엣지 풀스크린 최적화도 Task 028에서 진행)
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

      {/* 풀스크린 지도 영역 골격 (Task 028에서 KakaoMap 으로 대체) */}
      <div className="relative overflow-hidden rounded-lg border">
        <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-2 bg-muted/40 text-center text-sm text-muted-foreground">
          <MapIcon className="size-8" aria-hidden="true" />
          <p>카카오맵과 등산로 폴리라인이 이 자리에 표시됩니다.</p>
          <p className="text-xs">(Task 028 · 029)</p>
        </div>
        <MapLegend
          statuses={["open", "partial", "closed"]}
          className="absolute right-3 bottom-3 left-3 sm:right-auto"
        />
      </div>
    </section>
  );
}
