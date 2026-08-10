import { Moon, Sunset } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SCORE_GRADE_LABEL,
  type HourlyConditionTrend as Trend,
  type ScoreGrade,
} from "@/lib/types";

/**
 * 시간대별 컨디션 추이 (Task 039, + 안전 출발 반영).
 *
 * "지금 갈 만한가"(단일 점수)를 "**오늘 언제 가면 좋은가**"로 확장한다. 앞으로의 시각별
 * 컨디션 점수를 막대로 보여주고 가장 좋은 시각을 강조한다. 서버 컴포넌트(정적 마크업) —
 * 데이터는 상위 스트리밍 섹션이 주입한다.
 *
 * 안전 출발: 왕복이 긴 산은 컨디션만 보고 늦은 시각을 추천하면 일몰 뒤 하산 위험이 있다.
 * 일몰 전 하산이 어려운 시간대는 달 아이콘 + 흐린 막대로 표시하고, 추천은 일몰 전 하산
 * 가능한 시간대에서만 고른다. 하단에 왕복시간·일몰 기준 "안전 출발 마감" 안내를 덧붙인다.
 *
 * 접근성: 색상 단독 금지 원칙에 따라 각 막대에 **점수 숫자를 함께** 표시하고, 막대 도형은
 * `aria-hidden`, 전체 추이는 sr-only 텍스트 요약으로 대체 제공한다. 최적 시각·안전 출발은
 * 텍스트 문장으로도 안내한다.
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

/** "HH:MM" → 친근한 시각(예: "오전 10시" / "오전 10시 20분"). */
function friendlyHm(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  const base = friendlyHour(`${String(h).padStart(2, "0")}00`);
  return m > 0 ? `${base} ${m}분` : base;
}

/** 분 → "N시간 M분" / "N시간" / "M분". */
function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function HourlyConditionTrend({ trend, className }: { trend: Trend; className?: string }) {
  if (trend.points.length === 0) return null;
  const best = trend.bestIndex >= 0 ? trend.points[trend.bestIndex] : null;
  const daylight = trend.daylight;
  const tooLate = daylight?.allTooLate ?? false;

  return (
    <section aria-labelledby="condition-trend-heading" className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="condition-trend-heading" className="text-sm font-semibold">
          언제 가면 좋을까
        </h3>
        {tooLate ? (
          <p className="text-xs font-medium text-muted-foreground">이른 출발을 권장해요</p>
        ) : best ? (
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
          // 추천 마커는 실제로 일몰 전 하산 가능한(안전) 최고 슬롯에만 붙인다.
          const isBest = i === trend.bestIndex && p.daylightSafe;
          const unsafe = !p.daylightSafe;
          // 0점이어도 최소 높이를 남겨 막대가 사라지지 않게 한다(점수는 숫자로 정확히 노출).
          const fillPct = Math.max(8, Math.round(p.score));
          return (
            <li key={`${p.date}${p.time}`} className="flex min-w-11 flex-col items-center gap-1">
              <span
                className={cn(
                  "text-[11px] font-semibold tabular-nums",
                  GRADE_TEXT_CLASS[p.grade],
                  unsafe && "opacity-40",
                )}
              >
                {p.score}
              </span>
              <div className="flex h-14 w-6 items-end overflow-hidden rounded-md bg-muted/60">
                <div
                  className={cn(
                    "w-full rounded-md",
                    GRADE_BAR_CLASS[p.grade],
                    unsafe && "opacity-30",
                  )}
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
              {/* 마커 행: 안전 최고=추천, 일몰 넘김=달 아이콘, 그 외=빈 자리(정렬 고정). */}
              {isBest ? (
                <span className="text-[10px] leading-none font-medium text-primary">추천</span>
              ) : unsafe ? (
                <Moon className="size-3 text-muted-foreground/60" aria-label="일몰 후" />
              ) : (
                <span className="h-[13px]" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ul>

      {/* 안전 출발(일몰) 안내 */}
      {daylight ? (
        <p className="flex items-start gap-1.5 border-t pt-2 text-xs text-muted-foreground">
          <Sunset className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {tooLate
              ? `긴 코스는 왕복 약 ${formatDuration(daylight.roundTripMin)}이라, 지금 출발하면 일몰(${daylight.sunsetLabel}) 전 하산이 어려워요. 짧은 코스나 이른 출발을 권장해요.`
              : `긴 코스 왕복 약 ${formatDuration(daylight.roundTripMin)} · 일몰 ${daylight.sunsetLabel} — 일몰 전 하산하려면 늦어도 ${friendlyHm(daylight.latestStartLabel)}엔 출발하세요.`}
          </span>
        </p>
      ) : null}

      {/* 색/막대에 의존하지 않는 스크린리더용 텍스트 대안 */}
      <p className="sr-only">
        {trend.points
          .map(
            (p) =>
              `${hourLabel(p.date, p.time)} ${SCORE_GRADE_LABEL[p.grade]} ${p.score}점${p.daylightSafe ? "" : " 일몰 후"}`,
          )
          .join(", ")}
        .
      </p>
    </section>
  );
}
