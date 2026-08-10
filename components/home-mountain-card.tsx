import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Mountain as MountainIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

/**
 * 홈 컨디션 블록 공용 산 카드. 상세로 직결하고, 우상단에 컨디션 점수 칩 슬롯(`chip`)을 둔다.
 *
 * `chip` 은 두 가지로 주입된다: (1) 즐겨찾기 블록은 카드별 `<Suspense>` 스트리밍 노드,
 * (2) "지금 갈 만한 산" 블록은 이미 계산·정렬된 `ConditionChip`. 이름·지역·고도 메타는
 * 항상 즉시 렌더한다. 360px 폭에서도 2열을 유지하고 44px 터치 타깃을 보장한다.
 *
 * **stretched-link 구조**: 카드 전체를 덮는 링크(→상세 상단)를 절대 배치하고, 실제 콘텐츠는
 * 그 위에 `pointer-events-none` 로 얹어 클릭이 링크로 통과하게 한다. `reviewSlot`(후기 배지)
 * 처럼 자체 링크가 있는 요소만 `pointer-events-auto` 로 되살려 별도 목적지(후기 섹션)로 보낸다.
 * 이렇게 하면 앵커 중첩(무효 마크업) 없이 카드 안에 두 번째 링크를 둘 수 있다.
 */
export function HomeMountainCard({
  id,
  name,
  region,
  altitude,
  chip,
  reviewSlot,
}: {
  id: string;
  name: string;
  region: string;
  altitude: number | null;
  chip: ReactNode;
  /** 후기 수 배지 등 카드 안의 별도 링크 슬롯(있으면 메타 하단에 렌더). */
  reviewSlot?: ReactNode;
}) {
  return (
    <Card className="relative flex h-full min-h-11 flex-col justify-between gap-3 p-4 shadow-sm transition-colors hover:bg-accent">
      {/* 카드 전체를 덮는 기본 링크(상세 상단으로). 텍스트가 링크 밖에 있으므로 접근명 부여. */}
      <Link
        href={`/mountains/${id}`}
        aria-label={`${name} 상세 보기`}
        className="absolute inset-0 z-0 rounded-[inherit]"
      />
      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-2">
        <MountainIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        {chip}
      </div>
      <div className="relative z-10 space-y-0.5">
        <div className="pointer-events-none flex items-center justify-between gap-1">
          <span className="truncate font-semibold tracking-tight">{name}</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="pointer-events-none truncate text-xs text-muted-foreground">
          {region}
          {altitude !== null ? ` · ${altitude.toLocaleString()}m` : ""}
        </p>
        {reviewSlot}
      </div>
    </Card>
  );
}
