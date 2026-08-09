import { Droplets } from "lucide-react";

import { weatherGlyph } from "@/components/weather-icons";
import { cn } from "@/lib/utils";
import type { HourlyForecast } from "@/lib/types";

/**
 * 시간대별 예보 스트립 (Task 034).
 *
 * 단기예보 응답의 앞으로의 시각별 슬롯을 가로 스크롤 카드로 보여준다. 각 칸은
 * 시각·날씨 아이콘·기온·강수확률(있을 때)을 담아 "몇 시부터 비/추위"를 한눈에 파악하게 한다.
 * 서버 컴포넌트(정적 마크업) — 데이터는 상위 스트리밍 섹션에서 주입한다.
 */

/** "HH시" 라벨. 자정(00시)은 날짜 경계 인지를 위해 "M/D" 로 대체한다. */
function hourLabel(date: string, time: string): string {
  const hour = Number(time.slice(0, 2));
  if (hour === 0) {
    const m = Number(date.slice(4, 6));
    const d = Number(date.slice(6, 8));
    return `${m}/${d}`;
  }
  return `${hour}시`;
}

export function HourlyForecastStrip({
  items,
  className,
}: {
  items: HourlyForecast[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="hourly-heading" className={cn("space-y-2", className)}>
      <h3 id="hourly-heading" className="text-sm font-semibold">
        시간대별
      </h3>
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {items.map((h) => {
          const Icon = weatherGlyph(h.sky, h.pty);
          return (
            <li
              key={`${h.date}${h.time}`}
              className="flex min-w-14 flex-col items-center gap-1 rounded-lg bg-muted/50 px-2 py-2 text-center"
            >
              <span className="text-xs text-muted-foreground tabular-nums">
                {hourLabel(h.date, h.time)}
              </span>
              <Icon className="size-5 text-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold tabular-nums">{Math.round(h.tempC)}°</span>
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[11px] tabular-nums",
                  h.pop >= 60 ? "text-primary" : "text-muted-foreground",
                  h.pop === 0 && "opacity-40",
                )}
              >
                <Droplets className="size-3" aria-hidden="true" />
                {h.pop}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
