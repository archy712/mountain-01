import { Droplets } from "lucide-react";

import { weatherGlyph } from "@/components/weather-icons";
import { cn } from "@/lib/utils";
import { PTY_LABEL, SKY_LABEL, type DailyForecast } from "@/lib/types";

/**
 * 일자별(3일) 예보 목록 (Task 034).
 *
 * 단기예보 범위(오늘~약 3일)의 하루 요약을 행으로 보여준다. 각 행은 날짜 라벨·날씨
 * 아이콘·강수확률·최저/최고 기온을 담아 "내일·모레 갈까?" 판단을 돕는다. 서버 컴포넌트.
 */

const REL_DAY_LABEL = ["오늘", "내일", "모레"] as const;
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** index 우선(오늘/내일/모레), 그 이후는 요일로 라벨링. */
function dayLabel(date: string, index: number): string {
  if (index < REL_DAY_LABEL.length) return REL_DAY_LABEL[index];
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(4, 6));
  const d = Number(date.slice(6, 8));
  return `${WEEKDAY[new Date(y, m - 1, d).getDay()]}요일`;
}

function temp(v: number | null): string {
  return v !== null ? `${Math.round(v)}°` : "—";
}

export function DailyForecastList({
  items,
  className,
}: {
  items: DailyForecast[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="daily-heading" className={cn("space-y-2", className)}>
      <h3 id="daily-heading" className="text-sm font-semibold">
        {items.length}일 예보
      </h3>
      <ul className="divide-y rounded-lg border">
        {items.map((day, i) => {
          const Icon = weatherGlyph(day.sky, day.pty);
          const label = day.pty !== "none" ? PTY_LABEL[day.pty] : SKY_LABEL[day.sky];
          return (
            <li key={day.date} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span className="w-10 shrink-0 font-medium">{dayLabel(day.date, i)}</span>
              <Icon className="size-5 shrink-0 text-foreground" aria-hidden="true" />
              <span className="flex-1 truncate text-muted-foreground">{label}</span>
              <span
                className={cn(
                  "flex items-center gap-0.5 tabular-nums",
                  day.pop >= 60 ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Droplets className="size-3.5" aria-hidden="true" />
                {day.pop}%
              </span>
              <span className="w-20 shrink-0 text-right tabular-nums">
                <span className="text-muted-foreground">{temp(day.tempMinC)}</span>
                {" / "}
                <span className="font-semibold">{temp(day.tempMaxC)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
