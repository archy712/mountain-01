"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * "N분 전 기준" 신선도 라벨.
 *
 * `PartialResult` 의 `fetchedAt`(ISO) 기준 경과 시간을 상대 표기한다.
 * 현재 시각에 의존하므로 클라이언트에서 마운트 후 계산해 하이드레이션 불일치와
 * Cache Components 캐시 오염을 피한다(마운트 전에는 렌더하지 않음).
 */

function formatRelative(fetchedAtMs: number, nowMs: number): string {
  const diffMin = Math.floor((nowMs - fetchedAtMs) / 60_000);
  if (diffMin < 1) return "방금 기준";
  if (diffMin < 60) return `${diffMin}분 전 기준`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전 기준`;
  const d = new Date(fetchedAtMs);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 기준`;
}

export interface StaleDataNoticeProps {
  /** 데이터 조회 시각(ISO 8601) */
  fetchedAt: string;
  className?: string;
}

export function StaleDataNotice({ fetchedAt, className }: StaleDataNoticeProps) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const fetchedAtMs = new Date(fetchedAt).getTime();
    if (Number.isNaN(fetchedAtMs)) return;
    const update = () => setLabel(formatRelative(fetchedAtMs, Date.now()));
    update();
    // 1분마다 라벨 갱신
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [fetchedAt]);

  if (label === null) return null;

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}
      title={new Date(fetchedAt).toLocaleString("ko-KR")}
    >
      <Clock className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}
