import {
  CalendarCheck,
  CircleCheck,
  MapPin,
  Mountain as MountainIcon,
  type LucideIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { LoadingBar } from "@/components/loading-bar";
import { cn } from "@/lib/utils";
import type { VisitedStats as Stats } from "@/lib/data/visited-stats";

/**
 * 산행 기록 통계 패널 (Task 040).
 *
 * 방문완료 화면 상단에 "다녀온 산 수·올해 방문·100대명산 진척·지역 분포"를 요약한다.
 * 외부 API 없이 방문 기록만으로 즉시 렌더된다(재방문율 KPI 를 뒷받침하는 성취 요약).
 * 서버 컴포넌트(정적 마크업) — 집계는 상위에서 주입한다. 색상 단독 금지: 진척은 막대와
 * 함께 "N / 100" 숫자를, 지역은 칩에 개수 숫자를 병기한다.
 */

function StatTile({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <li className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/50 px-2 py-3 text-center">
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-lg leading-tight font-bold tabular-nums">
        {value}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </li>
  );
}

export function VisitedStats({ stats, className }: { stats: Stats; className?: string }) {
  const pct =
    stats.top100Total > 0 ? Math.round((stats.top100Visited / stats.top100Total) * 100) : 0;
  // 0%가 아니면 막대가 최소 3% 는 보이게 해 "시작됨"을 시각화(숫자는 정확히 노출).
  const barWidth = stats.top100Visited > 0 ? Math.max(pct, 3) : 0;
  const topRegions = stats.regions.slice(0, 6);
  const restRegions = stats.regions.length - topRegions.length;

  return (
    <section
      aria-labelledby="visited-stats-heading"
      className={cn("space-y-4 rounded-lg border p-5", className)}
    >
      <h2 id="visited-stats-heading" className="text-base font-semibold">
        산행 기록
      </h2>

      <ul className="grid grid-cols-3 gap-2">
        <StatTile icon={MountainIcon} label="다녀온 산" value={stats.total} unit="곳" />
        <StatTile icon={CalendarCheck} label="올해" value={stats.thisYear} unit="곳" />
        <StatTile
          icon={CircleCheck}
          label="100대명산"
          value={stats.top100Visited}
          unit={`/ ${stats.top100Total}`}
        />
      </ul>

      {/* 100대명산 진척 */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">100대명산 진척</span>
          <span className="text-muted-foreground tabular-nums">
            <span className="font-semibold text-status-open">{stats.top100Visited}</span> /{" "}
            {stats.top100Total} ({pct}%)
          </span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={stats.top100Visited}
          aria-valuemin={0}
          aria-valuemax={stats.top100Total}
          aria-label={`100대명산 ${stats.top100Total}곳 중 ${stats.top100Visited}곳 방문`}
        >
          <div className="h-full rounded-full bg-status-open" style={{ width: `${barWidth}%` }} />
        </div>
      </div>

      {/* 지역 분포 */}
      {topRegions.length > 0 ? (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-sm font-medium">
            <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
            지역 분포
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {topRegions.map((r) => (
              <li
                key={r.region}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
              >
                <span className="text-foreground/80">{r.region}</span>
                <span className="font-semibold text-foreground tabular-nums">{r.count}</span>
              </li>
            ))}
            {restRegions > 0 ? (
              <li className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                +{restRegions}개 지역
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/**
 * 산행 기록 통계 로딩 스켈레톤 (Task 040). 실제 패널 구조(타일 3 + 진척 바 + 지역 칩)를
 * 흉내 내 높이를 예약한다(CLS 회피). 방문 목록 스켈레톤과 함께 방문 화면 폴백을 구성한다.
 */
export function VisitedStatsSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border p-5" aria-busy="true">
      <LoadingBar />
      <Skeleton className="h-5 w-20" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
        ))}
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
    </div>
  );
}
