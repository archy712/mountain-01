import { Route } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TrailSummary } from "@/lib/trails/summary";

/**
 * 탐방로 코스 요약 바 (Task 034).
 *
 * 목록 위에 전체 코스 수·개방/통제 현황·거리 범위를 칩으로 압축해, 스크롤 전에 "이 산에
 * 열린 코스가 몇 개이고 얼마나 긴지"를 즉시 파악하게 한다. 상태색은 탐방로 상태 토큰
 * (`--status-*`)을 재사용하되 텍스트 라벨을 병기한다(색상 단독 금지).
 */

function fmtKm(km: number): string {
  return `${km.toFixed(1)}km`;
}

export function TrailSummaryBar({
  summary,
  className,
}: {
  summary: TrailSummary;
  className?: string;
}) {
  const statusChips: { label: string; count: number; tone: string }[] = [
    { label: "개방", count: summary.open, tone: "text-status-open" },
    { label: "부분통제", count: summary.partial, tone: "text-status-partial" },
    { label: "통제", count: summary.closed, tone: "text-status-closed" },
    { label: "정보없음", count: summary.unknown, tone: "text-status-unknown" },
  ].filter((c) => c.count > 0);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-muted/50 px-3 py-2 text-sm",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <Route className="size-4 text-muted-foreground" aria-hidden="true" />
        코스 {summary.total}곳
      </span>
      {statusChips.map((c) => (
        <span key={c.label} className="flex items-center gap-1 tabular-nums">
          <span className={cn("font-semibold", c.tone)}>{c.label}</span>
          {c.count}
        </span>
      ))}
      {summary.shortestKm !== null && summary.longestKm !== null ? (
        <span className="ml-auto text-muted-foreground tabular-nums">
          최단 {fmtKm(summary.shortestKm)} · 최장 {fmtKm(summary.longestKm)}
        </span>
      ) : null}
    </div>
  );
}
