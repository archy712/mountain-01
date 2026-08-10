import { cn } from "@/lib/utils";
import {
  SCORE_GRADE_LABEL,
  type HourlyConditionTrend as Trend,
  type ScoreGrade,
} from "@/lib/types";

/**
 * 시간대별 컨디션 추이 (Task 039).
 *
 * "지금 갈 만한가"(단일 점수)를 "**오늘 언제 가면 좋은가**"로 확장한다. 앞으로의 시각별
 * 컨디션 점수를 막대로 보여주고 가장 좋은 시각을 강조한다. 서버 컴포넌트(정적 마크업) —
 * 데이터는 상위 스트리밍 섹션이 주입한다.
 *
 * 접근성: 색상 단독 금지 원칙에 따라 각 막대에 **점수 숫자를 함께** 표시하고, 막대 도형은
 * `aria-hidden`, 전체 추이는 sr-only 텍스트 요약으로 대체 제공한다. 최적 시각은 텍스트
 * 문장으로도 안내한다.
 */

const GRADE_BAR_CLASS: Record<ScoreGrade, string> = {
  excellent: "bg-grade-excellent",
  good: "bg-grade-good",
  fair: "bg-grade-fair",
  poor: "bg-grade-poor",
  dangerous: "bg-grade-dangerous",
};

const GRADE_TEXT_CLASS: Record<ScoreGrade, string> = {
  excellent: "text-grade-excellent",
  good: "text-grade-good",
  fair: "text-grade-fair",
  poor: "text-grade-poor",
  dangerous: "text-grade-dangerous",
};

/** "HH시" 라벨. 자정(00시)은 날짜 경계 인지를 위해 "M/D" 로 대체한다(스트립과 동일 규칙). */
function hourLabel(date: string, time: string): string {
  const hour = Number(time.slice(0, 2));
  if (hour === 0) {
    const m = Number(date.slice(4, 6));
    const d = Number(date.slice(6, 8));
    return `${m}/${d}`;
  }
  return `${hour}시`;
}

/** 문장용 친근한 시각 표기(예: "오전 9시" / "오후 3시" / "정오" / "자정"). */
function friendlyHour(time: string): string {
  const hour = Number(time.slice(0, 2));
  if (hour === 0) return "자정";
  if (hour === 12) return "정오";
  return hour < 12 ? `오전 ${hour}시` : `오후 ${hour - 12}시`;
}

export function HourlyConditionTrend({ trend, className }: { trend: Trend; className?: string }) {
  if (trend.points.length === 0) return null;
  const best = trend.bestIndex >= 0 ? trend.points[trend.bestIndex] : null;

  return (
    <section aria-labelledby="condition-trend-heading" className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="condition-trend-heading" className="text-sm font-semibold">
          언제 가면 좋을까
        </h3>
        {best ? (
          <p className="text-xs text-muted-foreground">
            <span className={cn("font-semibold", GRADE_TEXT_CLASS[best.grade])}>
              {friendlyHour(best.time)}
            </span>
            경이 가장 좋아요
          </p>
        ) : null}
      </div>

      <ul className="-mx-1 flex items-end gap-1 overflow-x-auto px-1 pb-1">
        {trend.points.map((p, i) => {
          const isBest = i === trend.bestIndex;
          // 0점이어도 최소 높이를 남겨 막대가 사라지지 않게 한다(점수는 숫자로 정확히 노출).
          const fillPct = Math.max(8, Math.round(p.score));
          return (
            <li key={`${p.date}${p.time}`} className="flex min-w-11 flex-col items-center gap-1">
              <span
                className={cn("text-[11px] font-semibold tabular-nums", GRADE_TEXT_CLASS[p.grade])}
              >
                {p.score}
              </span>
              <div className="flex h-14 w-6 items-end overflow-hidden rounded-md bg-muted/60">
                <div
                  className={cn("w-full rounded-md", GRADE_BAR_CLASS[p.grade])}
                  style={{ height: `${fillPct}%` }}
                  aria-hidden="true"
                />
              </div>
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  isBest ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {hourLabel(p.date, p.time)}
              </span>
              {/* 최적 시각 마커. 높이를 항상 예약해(빈 span) 막대 정렬이 흔들리지 않게 한다. */}
              {isBest ? (
                <span className="text-[10px] leading-none font-medium text-primary">추천</span>
              ) : (
                <span className="h-[13px]" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ul>

      {/* 색/막대에 의존하지 않는 스크린리더용 텍스트 대안 */}
      <p className="sr-only">
        {trend.points
          .map((p) => `${hourLabel(p.date, p.time)} ${SCORE_GRADE_LABEL[p.grade]} ${p.score}점`)
          .join(", ")}
        .
      </p>
    </section>
  );
}
