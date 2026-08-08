"use client";

import Link from "next/link";
import { Clock, X } from "lucide-react";

import { useRecentSearches } from "@/hooks/use-recent-searches";

/**
 * 최근 검색(선택한 산) 칩 목록 (Task 009).
 *
 * `localStorage` 기반(`useRecentSearches`). 칩 클릭 시 해당 산 상세로 이동하고,
 * 각 칩의 × 버튼으로 개별 삭제한다. 기록이 없으면 렌더하지 않는다(빈 상태 = 미노출).
 */
export function RecentSearches() {
  const { recent, remove, clear } = useRecentSearches();

  // SSR/초기 스냅샷은 빈 배열이므로, 기록이 없으면 영역 자체를 숨긴다(빈 상태 = 미노출).
  if (recent.length === 0) return null;

  return (
    <section aria-labelledby="recent-searches-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2
          id="recent-searches-heading"
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
        >
          <Clock className="size-4" aria-hidden="true" />
          최근 검색
        </h2>
        <button
          type="button"
          onClick={clear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          전체 삭제
        </button>
      </div>

      <ul className="flex flex-wrap gap-2">
        {recent.map((item) => (
          <li key={item.id} className="flex items-stretch overflow-hidden rounded-full border">
            <Link
              href={`/mountains/${item.id}`}
              className="flex min-h-11 items-center gap-1.5 py-1 pr-2 pl-3.5 text-sm hover:bg-accent"
            >
              <span className="font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.region}</span>
            </Link>
            <button
              type="button"
              aria-label={`${item.name} 최근 검색에서 삭제`}
              onClick={() => remove(item.id)}
              className="flex min-h-11 items-center justify-center border-l px-2.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
