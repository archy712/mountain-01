import { Factory, Haze, Sun, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AIR_GRADE_LABEL,
  UV_GRADE_LABEL,
  type AirGrade,
  type AirQuality,
  type UvGrade,
  type UvIndex,
} from "@/lib/types";

/**
 * 대기질·자외선 요약 패널 (Task 034 개선).
 *
 * 기존에는 PM10/PM2.5 알약 → 측정소 캡션 → 자외선 알약이 세로로 흩어져 자외선이 고아처럼
 * 떨어져 보였다. 날씨 카드의 타일 그리드와 **동일한 3칸 타일(PM10·PM2.5·자외선)** + 영역
 * 제목으로 정렬해 한눈에 읽히게 한다. 등급은 색상 단독이 아니라 텍스트(좋음/보통…)를 병기하고,
 * 색상은 컨디션 등급 토큰(`--grade-*`)을 의미 매핑해 재사용한다. 측정소·거리는 대기질 출처
 * 각주로 하단에 둔다. 측정값이 없는 항목은 "정보 없음"으로 표시한다.
 */

const AIR_TONE: Record<AirGrade, string> = {
  good: "text-grade-excellent",
  moderate: "text-grade-fair",
  unhealthy: "text-grade-poor",
  "very-unhealthy": "text-grade-dangerous",
};

const UV_TONE: Record<UvGrade, string> = {
  low: "text-grade-excellent",
  moderate: "text-grade-good",
  high: "text-grade-fair",
  "very-high": "text-grade-poor",
  extreme: "text-grade-dangerous",
};

function MetricTile({
  icon: Icon,
  label,
  value,
  gradeLabel,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null;
  gradeLabel: string | null;
  tone: string | null;
}) {
  const has = value !== null && gradeLabel !== null && tone !== null;
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-2 py-3 text-center">
      <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      <span className="text-xs text-muted-foreground">{label}</span>
      {has ? (
        <span className={cn("text-sm font-semibold tabular-nums", tone)}>
          {value}
          <span className="ml-1 text-xs font-medium">{gradeLabel}</span>
        </span>
      ) : (
        <span className="text-sm font-medium text-muted-foreground">정보 없음</span>
      )}
    </div>
  );
}

export function AirUvSummary({
  air,
  uv,
  className,
}: {
  air: AirQuality | null;
  uv: UvIndex | null;
  className?: string;
}) {
  if (!air && !uv) return null;

  return (
    <section aria-labelledby="airuv-heading" className={cn("space-y-2", className)}>
      <h3 id="airuv-heading" className="text-sm font-semibold">
        대기질 · 자외선
      </h3>
      <div className="grid grid-cols-3 gap-2">
        <MetricTile
          icon={Haze}
          label="PM10"
          value={air?.pm10 ?? null}
          gradeLabel={air?.pm10Grade ? AIR_GRADE_LABEL[air.pm10Grade] : null}
          tone={air?.pm10Grade ? AIR_TONE[air.pm10Grade] : null}
        />
        <MetricTile
          icon={Haze}
          label="PM2.5"
          value={air?.pm25 ?? null}
          gradeLabel={air?.pm25Grade ? AIR_GRADE_LABEL[air.pm25Grade] : null}
          tone={air?.pm25Grade ? AIR_TONE[air.pm25Grade] : null}
        />
        <MetricTile
          icon={Sun}
          label="자외선"
          value={uv?.value ?? null}
          gradeLabel={uv ? UV_GRADE_LABEL[uv.grade] : null}
          tone={uv ? UV_TONE[uv.grade] : null}
        />
      </div>
      {air ? (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Factory className="size-3" aria-hidden="true" />
          {air.stationName} 측정소 · {air.distanceKm.toFixed(1)}km
        </p>
      ) : null}
    </section>
  );
}
