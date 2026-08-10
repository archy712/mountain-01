import { CalendarDays, Haze, Wind } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AIR_GRADE_LABEL,
  type AirGrade,
  type DustForecast,
  type DustForecastDay,
} from "@/lib/types";

/**
 * 대기질 예보 패널 (Task 052).
 *
 * 실시간 측정(오늘·지금)만 있던 대기질에 **오늘·내일 예보 등급**(에어코리아 예보통보)을 더해
 * "내일/주말 산행 계획"을 돕는다. 색상 단독 구분 금지 원칙에 따라 등급 텍스트(좋음/보통/…)를
 * 항상 병기하고, 색상은 컨디션 등급 토큰(`--grade-*`)을 의미 매핑해 재사용한다. 발생원인·
 * 예보권역·발표시각은 근거 각주로 하단에 둔다.
 */

const AIR_TONE: Record<AirGrade, string> = {
  good: "text-grade-excellent",
  moderate: "text-grade-fair",
  unhealthy: "text-grade-poor",
  "very-unhealthy": "text-grade-dangerous",
};

const WHEN_LABEL: Record<DustForecastDay["when"], string> = {
  today: "오늘",
  tomorrow: "내일",
};

function GradePill({ label, grade }: { label: string; grade: AirGrade | null }) {
  return (
    <div className="flex flex-1 items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {grade ? (
        <span className={cn("text-sm font-semibold", AIR_TONE[grade])}>
          {AIR_GRADE_LABEL[grade]}
        </span>
      ) : (
        <span className="text-sm font-medium text-muted-foreground">정보 없음</span>
      )}
    </div>
  );
}

export function DustForecastPanel({
  forecast,
  className,
}: {
  forecast: DustForecast;
  className?: string;
}) {
  return (
    <section aria-labelledby="dust-forecast-heading" className={cn("space-y-3", className)}>
      <h3 id="dust-forecast-heading" className="flex items-center gap-1.5 text-sm font-semibold">
        <Haze className="size-4 text-muted-foreground" aria-hidden="true" />
        대기질 예보
      </h3>

      <ul className="space-y-2">
        {forecast.days.map((day) => (
          <li key={day.date} className="flex items-center gap-2">
            <span className="flex w-9 shrink-0 items-center gap-1 text-sm font-medium">
              <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {WHEN_LABEL[day.when]}
            </span>
            <GradePill label="PM10" grade={day.pm10Grade} />
            <GradePill label="PM2.5" grade={day.pm25Grade} />
          </li>
        ))}
      </ul>

      {forecast.cause ? (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Wind className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>{forecast.cause}</span>
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {forecast.regionName} 권역 기준
        {forecast.announcedAt ? ` · ${forecast.announcedAt}` : ""} · 에어코리아 예보통보
      </p>
    </section>
  );
}
