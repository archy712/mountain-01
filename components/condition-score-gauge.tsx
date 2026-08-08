import { cn } from "@/lib/utils";
import { SCORE_GRADE_LABEL, type ConditionScore, type ScoreGrade } from "@/lib/types";

/**
 * 컨디션 점수 게이지 (Task 011, 결정 003 v1).
 *
 * 0~100 원형 게이지 + **텍스트 등급·메시지 병기(접근성 필수)**. 색상 단독이 아니라
 * 항상 등급 텍스트를 함께 노출한다. 등급별 색상은 `--grade-*` 토큰을 `currentColor`
 * 로 전달해 링/텍스트에 일관 적용한다.
 *
 * "결론 우선" 위계의 최상단 히어로로, 스크롤 없이 산행 가부를 한눈에 판단시킨다.
 */

const GRADE_TEXT_CLASS: Record<ScoreGrade, string> = {
  excellent: "text-grade-excellent",
  good: "text-grade-good",
  fair: "text-grade-fair",
  poor: "text-grade-poor",
  dangerous: "text-grade-dangerous",
};

// 원형 게이지 도형 상수
const SIZE = 168;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ConditionScoreGauge({
  condition,
  className,
}: {
  condition: ConditionScore;
  className?: string;
}) {
  const score = Math.max(0, Math.min(100, Math.round(condition.score)));
  const offset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <section
      aria-labelledby="condition-score-heading"
      className={cn("flex flex-col items-center gap-3 text-center", className)}
    >
      <h2 id="condition-score-heading" className="sr-only">
        컨디션 점수
      </h2>

      <div
        className={cn("relative", GRADE_TEXT_CLASS[condition.grade])}
        style={{ width: SIZE, height: SIZE }}
        role="img"
        aria-label={`컨디션 점수 100점 만점에 ${score}점, 등급 ${SCORE_GRADE_LABEL[condition.grade]}`}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            className="stroke-muted"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-foreground tabular-nums">{score}</span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>
      </div>

      {/* 색상 단독 구분 금지: 등급 텍스트 항상 병기 */}
      <div className="space-y-1">
        <p className={cn("text-lg font-bold", GRADE_TEXT_CLASS[condition.grade])}>
          {SCORE_GRADE_LABEL[condition.grade]}
        </p>
        <p className="text-sm text-muted-foreground">{condition.message}</p>
      </div>
    </section>
  );
}
