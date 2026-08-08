import { Factory } from "lucide-react";

import { cn } from "@/lib/utils";
import { AIR_GRADE_LABEL, type AirGrade, type AirQuality } from "@/lib/types";

/**
 * 대기질 배지 (Task 011).
 *
 * PM10·PM2.5 농도와 등급을 색상 단독이 아닌 **텍스트 등급 병기**로 노출한다.
 * 등급색은 컨디션 등급 토큰(`--grade-*`)을 의미 매핑해 재사용한다(좋음=녹색 … 매우나쁨=적색).
 * 매핑 측정소·거리를 캡션으로 함께 보여 신뢰도를 투명화한다(결정 001 #5).
 */

// AirGrade → 등급 색상 톤 (Tailwind JIT 스캔을 위해 완전한 클래스 문자열로 명시)
const AIR_TONE_CLASS: Record<AirGrade, string> = {
  good: "border-grade-excellent/30 bg-grade-excellent/10 text-grade-excellent",
  moderate: "border-grade-fair/30 bg-grade-fair/10 text-grade-fair",
  unhealthy: "border-grade-poor/30 bg-grade-poor/10 text-grade-poor",
  "very-unhealthy": "border-grade-dangerous/30 bg-grade-dangerous/10 text-grade-dangerous",
};

function Pill({
  label,
  value,
  grade,
}: {
  label: string;
  value: number | null;
  grade: AirGrade | null;
}) {
  const hasValue = value !== null && grade !== null;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        hasValue ? AIR_TONE_CLASS[grade] : "text-muted-foreground",
      )}
    >
      <span className="opacity-80">{label}</span>
      {hasValue ? (
        <span className="tabular-nums">
          {value} · {AIR_GRADE_LABEL[grade]}
        </span>
      ) : (
        <span>측정값 없음</span>
      )}
    </div>
  );
}

export function AirQualityBadge({ air, className }: { air: AirQuality; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap gap-2">
        <Pill label="PM10" value={air.pm10} grade={air.pm10Grade} />
        <Pill label="PM2.5" value={air.pm25} grade={air.pm25Grade} />
      </div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Factory className="size-3" aria-hidden="true" />
        {air.stationName} 측정소 · {air.distanceKm.toFixed(1)}km
      </p>
    </div>
  );
}
