import { Droplet, Droplets, Wind, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ErrorFallback } from "@/components/error-fallback";
import { StaleDataNotice } from "@/components/stale-data-notice";
import { PTY_ICON, SKY_ICON } from "@/components/weather-icons";
import { cn } from "@/lib/utils";
import {
  hasData,
  PTY_LABEL,
  SKY_LABEL,
  type PartialResult,
  type WeatherSnapshot,
} from "@/lib/types";

/**
 * 날씨 요약 카드 (Task 010, 1단계 범위).
 *
 * 기온·강수확률·하늘상태·강수형태·풍속·습도를 한 화면에 요약한다(아이콘 + 수치 병기).
 * "결론 우선" 히어로 영역의 핵심으로, 스크롤 없이 오늘 산 날씨를 판단하게 한다.
 *
 * `PartialResult` 를 받아 소스 단위 부분 실패를 격리한다:
 * - failure → 날씨만 실패한 에러 폴백(다른 섹션은 정상 렌더)
 * - stale   → 마지막 성공 데이터 + "N분 전 기준" 라벨
 */

function MetricTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-2 py-3 text-center">
      <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function WeatherSummaryCard({
  result,
  className,
}: {
  result: PartialResult<WeatherSnapshot>;
  className?: string;
}) {
  if (!hasData(result)) {
    return (
      <ErrorFallback
        error={result.error}
        title="날씨 정보를 불러오지 못했어요"
        refreshOnRetry
        className={className}
      />
    );
  }

  const w = result.data;
  const SkyIcon = SKY_ICON[w.sky];
  const isStale = result.status === "stale";
  // 강수형태가 '없음'이면 하늘상태 아이콘을 대표로 노출
  const showPty = w.pty !== "none";

  return (
    <Card className={cn("space-y-4 p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SkyIcon className="size-12 shrink-0 text-foreground" aria-hidden="true" />
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">{Math.round(w.tempC)}℃</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                체감 {Math.round(w.feelsLikeC)}℃
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {SKY_LABEL[w.sky]}
              {showPty ? ` · ${PTY_LABEL[w.pty]}` : ""}
              {w.tempMinC !== null || w.tempMaxC !== null ? (
                <span className="tabular-nums">
                  {" · "}최저 {w.tempMinC !== null ? Math.round(w.tempMinC) : "—"}° / 최고{" "}
                  {w.tempMaxC !== null ? Math.round(w.tempMaxC) : "—"}°
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <StaleDataNotice fetchedAt={result.fetchedAt} />
      </div>

      {isStale ? (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          최신 데이터를 불러오지 못해 마지막 정보를 표시하고 있어요.
        </p>
      ) : null}

      <div className="grid grid-cols-4 gap-2">
        <MetricTile icon={Droplets} label="강수확률" value={`${w.pop}%`} />
        <MetricTile icon={PTY_ICON[w.pty]} label="강수형태" value={PTY_LABEL[w.pty]} />
        <MetricTile icon={Wind} label="풍속" value={`${w.windSpeedMs.toFixed(1)}㎧`} />
        <MetricTile icon={Droplet} label="습도" value={`${w.humidity}%`} />
      </div>
    </Card>
  );
}
