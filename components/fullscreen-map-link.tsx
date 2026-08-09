"use client";

import Link from "next/link";
import { Maximize2 } from "lucide-react";

import { useTrailSelection } from "@/components/trail-selection";

/**
 * 상세 화면의 "전체화면" 링크 (Task 033 후속).
 *
 * 전체화면 지도는 별도 라우트라 이동 시 `TrailSelectionProvider` 가 새로 마운트되어 선택이
 * 사라진다. 현재 선택된 코스를 `?trail=<id>` 쿼리로 실어 보내, 전체화면에서 동일 코스를
 * 복원·강조하도록 한다. 선택이 없으면 쿼리 없이 이동한다.
 */
export function FullscreenMapLink({ mountainId }: { mountainId: string }) {
  const { selectedId } = useTrailSelection();
  const href = selectedId
    ? `/mountains/${mountainId}/map?trail=${encodeURIComponent(selectedId)}`
    : `/mountains/${mountainId}/map`;

  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <Maximize2 className="size-4" aria-hidden="true" />
      전체화면
    </Link>
  );
}
