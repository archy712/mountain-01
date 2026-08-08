import type { ReactNode } from "react";
import { MapPin, Mountain as MountainIcon } from "lucide-react";

import type { Mountain } from "@/lib/types";

/**
 * 산 기본 메타 헤더 (Task 010).
 *
 * 산 이름(페이지 h1) + 지역·고도 요약. 상세 화면 최상단에 배치해
 * "지금 보는 산이 무엇인지"를 즉시 식별시킨다. `action` 슬롯에는 즐겨찾기 버튼 등
 * 우측 상단 액션을 배치한다(Task 025).
 */
export function MountainDetail({ mountain, action }: { mountain: Mountain; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{mountain.name}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden="true" />
            {mountain.region}
          </span>
          {mountain.altitude !== null ? (
            <span className="inline-flex items-center gap-1">
              <MountainIcon className="size-4" aria-hidden="true" />
              {mountain.altitude.toLocaleString()}m
            </span>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
