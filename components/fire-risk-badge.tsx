import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";
import { FIRE_LEVEL_LABEL, type FireLevel, type FireRisk } from "@/lib/types";

/**
 * 산불위험 배지 (Task 043).
 *
 * 산림청 산불위험예보(시도 단위)를 상세 컨디션 카드에 노출한다. 색상 단독 구분 금지 원칙에
 * 따라 불꽃 아이콘 + 등급 텍스트(낮음/다소 높음/…)를 항상 병기하고, 색상은 컨디션 등급
 * 토큰(`--grade-*`)을 의미 매핑해 재사용한다. 지수·분석 지역은 근거로 함께 표기한다.
 */

const FIRE_TONE: Record<FireLevel, string> = {
  low: "text-grade-excellent",
  moderate: "text-grade-fair",
  high: "text-grade-poor",
  "very-high": "text-grade-dangerous",
};

const FIRE_CAPTION: Record<FireLevel, string> = {
  low: "산행에 무리 없어요",
  moderate: "불씨 관리에 유의하세요",
  high: "산불 위험이 높아요",
  "very-high": "입산통제 가능성이 큽니다",
};

export function FireRiskBadge({ fire, className }: { fire: FireRisk; className?: string }) {
  const tone = FIRE_TONE[fire.level];
  const label = FIRE_LEVEL_LABEL[fire.level];

  return (
    <section aria-labelledby="fire-heading" className={cn("space-y-2", className)}>
      <h3 id="fire-heading" className="text-sm font-semibold">
        산불위험
      </h3>
      <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-3">
        <Flame className={cn("size-6 shrink-0", tone)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-1.5">
            <span className={cn("text-base font-semibold", tone)}>{label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">지수 {fire.index}</span>
          </p>
          <p className="text-xs text-muted-foreground">{FIRE_CAPTION[fire.level]}</p>
        </div>
      </div>
      {fire.regionName ? (
        <p className="text-xs text-muted-foreground">
          {fire.regionName} 기준 · 산림청 산불위험예보
        </p>
      ) : null}
    </section>
  );
}
