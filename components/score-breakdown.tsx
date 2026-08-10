import {
  Check,
  CloudFog,
  Droplets,
  Info,
  Sun,
  ThermometerSun,
  Wind,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ScoreFactor, ScoreFactorAssessment } from "@/lib/types";

/**
 * 컨디션 점수 근거 (Task 011 → 점수 근거 UI 확장).
 *
 * 감점된 요인만 나열하면 컨디션 좋은 날은 근거가 한 줄뿐이라 빈약해 보였다. 이제 6개 입력을
 * 5개 표시 요인으로 정리해 **좋은 요인은 "양호 ✓", 아쉬운 요인은 감점(−N)과 막대**로 전부
 * 보여준다. 하단 한 줄 요약으로 "왜 이 점수인지"를 마무리한다(색상 단독 금지: 상태 텍스트·숫자 병기).
 */

const FACTOR_ICON: Record<ScoreFactor, LucideIcon> = {
  temp: ThermometerSun,
  pop: Droplets,
  pty: Droplets,
  wind: Wind,
  air: CloudFog,
  uv: Sun,
};

/** 좋은 요인 위주의 한 줄 요약. 감점 요인이 있으면 가장 큰 것을 짚어준다. */
function summarize(factors: ScoreFactorAssessment[]): string {
  const cautions = factors
    .filter((f) => f.status === "caution")
    .sort((a, b) => b.penalty - a.penalty);
  if (cautions.length === 0) return "모든 조건이 쾌적해요. 산행하기 좋아요.";
  if (cautions.length === 1) return `대체로 쾌적해요. ${cautions[0].label}만 유의하세요.`;
  return `${cautions[0].label} 등 ${cautions.length}가지 조건을 유의하세요.`;
}

export function ScoreBreakdown({
  factors,
  className,
}: {
  factors: ScoreFactorAssessment[];
  className?: string;
}) {
  const counts = [
    { n: factors.filter((f) => f.status === "good").length, label: "양호" },
    { n: factors.filter((f) => f.status === "caution").length, label: "유의" },
    { n: factors.filter((f) => f.status === "excluded").length, label: "제외" },
  ].filter((c) => c.n > 0);

  return (
    <Card className={cn("space-y-3 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">점수 근거</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {counts.map((c) => `${c.n} ${c.label}`).join(" · ")}
        </span>
      </div>

      <ul className="space-y-2.5">
        {factors.map((f) => {
          const Icon = FACTOR_ICON[f.factor];
          return (
            <li key={f.factor} className="flex items-center gap-3">
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-medium">{f.label}</span>
                  <span className="truncate text-sm text-muted-foreground tabular-nums">
                    {f.valueText}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{f.note}</p>
              </div>

              {f.status === "good" ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-status-open">
                  <Check className="size-3.5" aria-hidden="true" />
                  양호
                </span>
              ) : f.status === "excluded" ? (
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Info className="size-3.5" aria-hidden="true" />
                  제외
                </span>
              ) : (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-grade-poor tabular-nums">
                    −{f.penalty}
                  </span>
                  <div
                    className="h-1.5 w-14 overflow-hidden rounded-full bg-muted"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-grade-poor"
                      style={{
                        width: `${Math.min(100, Math.round((f.penalty / f.maxPenalty) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="border-t pt-3 text-xs text-muted-foreground">{summarize(factors)}</p>
    </Card>
  );
}
