import { Sunrise, Sunset } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SunTimes } from "@/lib/geo/sun-times";

/**
 * 일출·일몰 시각 행 (Task 034).
 *
 * 하산 데드라인·행동 계획에 직결되는 정보라 날씨 요약 곁에 배치한다. 위경도로 계산한
 * KST 시각(외부 API 불필요)을 아이콘+텍스트로 보여준다. 둘 다 계산 불가면 렌더하지 않는다.
 */
export function SunTimesRow({ sun, className }: { sun: SunTimes; className?: string }) {
  if (!sun.sunrise && !sun.sunset) return null;

  return (
    <div
      className={cn("flex items-center gap-4 rounded-lg bg-muted/50 px-3 py-2 text-sm", className)}
    >
      {sun.sunrise ? (
        <span className="flex items-center gap-1.5">
          <Sunrise className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">일출</span>
          <span className="font-medium tabular-nums">{sun.sunrise}</span>
        </span>
      ) : null}
      {sun.sunset ? (
        <span className="flex items-center gap-1.5">
          <Sunset className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">일몰</span>
          <span className="font-medium tabular-nums">{sun.sunset}</span>
        </span>
      ) : null}
    </div>
  );
}
