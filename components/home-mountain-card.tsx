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
 */
export function HomeMountainCard({
  id,
  name,
  region,
  altitude,
  chip,
}: {
  id: string;
  name: string;
  region: string;
  altitude: number | null;
  chip: ReactNode;
}) {
  return (
    <Link href={`/mountains/${id}`} className="block h-full">
      <Card className="flex h-full min-h-11 flex-col justify-between gap-3 p-4 shadow-sm transition-colors hover:bg-accent">
        <div className="flex items-start justify-between gap-2">
          <MountainIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {chip}
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate font-semibold tracking-tight">{name}</span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {region}
            {altitude !== null ? ` · ${altitude.toLocaleString()}m` : ""}
          </p>
        </div>
      </Card>
    </Link>
  );
}
