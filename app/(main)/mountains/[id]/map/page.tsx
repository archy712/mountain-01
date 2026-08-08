import Link from "next/link";
import { ArrowLeft, Map as MapIcon } from "lucide-react";

import { MapLegend } from "@/components/map-legend";
import { getMountainById } from "@/lib/mock";

/**
 * 전체화면 지도 화면 레이아웃 골격 (Task 012).
 *
 * 카카오맵 SDK 로딩·등산로 폴리라인 오버레이는 Phase 5(Task 028·029)에서 구현한다.
 * 여기서는 풀스크린 지도 영역 + 뒤로가기 + 범례 오버레이의 마크업 골격만 둔다.
 * (엣지-투-엣지 풀스크린 최적화도 Task 028에서 진행)
 *
 * Next.js 16 규약: params 는 비동기(Promise)이다.
 */
export default async function MountainMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mountain = getMountainById(id);
  const title = mountain ? `${mountain.name} 지도` : "지도";

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
