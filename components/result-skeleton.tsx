import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * 산 상세 결과 화면 로딩 스켈레톤.
 *
 * `MountainDetailData` 렌더 레이아웃(Task 010)의 골격을 흉내내
 * 데이터 도착 시 레이아웃 점프(CLS)를 줄인다:
 * 산 메타 헤더 → 날씨 요약 카드 → 탐방로 목록.
 */
export function ResultSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">정보를 불러오는 중입니다…</span>

      {/* 산 메타 헤더 */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* 날씨 요약 카드 */}
      <div className="rounded-lg border p-4">
        <Skeleton className="mb-4 h-5 w-24" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 탐방로 목록 */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-20" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border p-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
