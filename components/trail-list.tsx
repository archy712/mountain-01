import { CircleHelp } from "lucide-react";

import { ErrorFallback } from "@/components/error-fallback";
import { StaleDataNotice } from "@/components/stale-data-notice";
import { TrailListInteractive } from "@/components/trail-list-interactive";
import { TrailSummaryBar } from "@/components/trail-summary-bar";
import { summarizeTrails } from "@/lib/trails/summary";
import { hasData, type PartialResult, type Trail } from "@/lib/types";

/**
 * 탐방로 목록 섹션 (Task 010, 1단계 범위).
 *
 * 코스별 개방/통제/부분통제 상태를 `TrailStatusBadge`(아이콘 + 텍스트)로 구분하고,
 * 통제/부분통제 시 사유·기간을 병기한다. `PartialResult` 로 부분 실패를 격리한다:
 * - failure    → 탐방로만 실패한 에러 폴백
 * - 빈 배열     → "정보 없음"(국립공원 외 커버리지 밖, 결정 001 #4)
 * - stale      → 마지막 성공 데이터 + "N분 전 기준"
 */
export function TrailList({ result }: { result: PartialResult<Trail[]> }) {
  return (
    <section aria-labelledby="trail-list-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="trail-list-heading" className="text-base font-semibold">
          탐방로
        </h2>
        {hasData(result) && result.status === "stale" ? (
          <StaleDataNotice fetchedAt={result.fetchedAt} />
        ) : null}
      </div>

      {!hasData(result) ? (
        <ErrorFallback
          error={result.error}
          title="탐방로 정보를 불러오지 못했어요"
          refreshOnRetry
        />
      ) : result.data.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <CircleHelp className="size-4 shrink-0" aria-hidden="true" />
          탐방로 개방 정보가 없어요. (국립공원 외 지역)
        </div>
      ) : (
        <div className="space-y-3">
          {(() => {
            const summary = summarizeTrails(result.data);
            return summary ? <TrailSummaryBar summary={summary} /> : null;
          })()}
          <TrailListInteractive trails={result.data} />
        </div>
      )}
    </section>
  );
}
