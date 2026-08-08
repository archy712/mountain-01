import { Info, ThumbsUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SCORE_FACTOR_LABEL, type ConditionScore } from "@/lib/types";

/**
 * 컨디션 점수 감점 근거 (Task 011).
 *
 * 주요 감점 요인을 "강수확률 70% −20" 형식으로 나열하고, 부분 폴백으로 계산에서
 * 제외된 변수가 있으면 "일부 데이터 제외" 배지로 투명하게 고지한다(결정 003 #10).
 */
export function ScoreBreakdown({
  condition,
  className,
}: {
  condition: ConditionScore;
  className?: string;
}) {
  const { breakdown, excludedVariables } = condition;

  return (
    <Card className={cn("space-y-3 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">점수 근거</h3>
        {excludedVariables.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-status-partial/30 bg-status-partial/10 px-2 py-0.5 text-xs font-medium text-status-partial">
            <Info className="size-3.5" aria-hidden="true" />
            일부 데이터 제외: {excludedVariables.map((f) => SCORE_FACTOR_LABEL[f]).join("·")}
          </span>
        ) : null}
      </div>

      {breakdown.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ThumbsUp className="size-4 text-grade-excellent" aria-hidden="true" />
          이렇다 할 감점 요인이 없어요.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {breakdown.map((item) => (
            <li key={item.factor} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-semibold text-grade-poor tabular-nums">−{item.penalty}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
