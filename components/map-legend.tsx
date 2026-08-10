import {
  CircleAlert,
  CircleCheck,
  CircleHelp,
  CircleSlash,
  Droplets,
  Store,
  TentTree,
  Toilet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { FACILITY_MARKER_STYLE } from "@/lib/facilities/marker-style";
import {
  FACILITY_TYPE_LABEL,
  TRAIL_STATUS_LABEL,
  type FacilityType,
  type TrailStatus,
} from "@/lib/types";

/**
 * 지도 탐방로 상태 + 편의시설 범례 (Task 012 → 유형 아이콘 핀 개편).
 *
 * 접근성 원칙(결정 001 #4): **색상 단독으로 구분하지 않는다.** 탐방로는 색 점 + 상태 아이콘 +
 * 라벨을, 편의시설은 유형 색 + **아이콘**(지도 핀과 동일) + 라벨을 함께 노출한다. 또한 클러스터
 * 숫자 배지가 "이 구역 편의시설 개수"임을 각주로 설명해, 지도의 숫자·점이 무엇인지 읽히게 한다.
 */

const STATUS_LEGEND: Record<TrailStatus, { icon: LucideIcon; dot: string; text: string }> = {
  open: { icon: CircleCheck, dot: "bg-status-open", text: "text-status-open" },
  closed: { icon: CircleSlash, dot: "bg-status-closed", text: "text-status-closed" },
  partial: { icon: CircleAlert, dot: "bg-status-partial", text: "text-status-partial" },
  unknown: { icon: CircleHelp, dot: "bg-status-unknown", text: "text-status-unknown" },
};

const FACILITY_ICON: Record<FacilityType, LucideIcon> = {
  toilet: Toilet,
  shelter: TentTree,
  spring: Droplets,
  shop: Store,
};

const DEFAULT_ORDER: TrailStatus[] = ["open", "partial", "closed", "unknown"];

export function MapLegend({
  statuses = DEFAULT_ORDER,
  facilities,
  className,
}: {
  /** 표시할 상태 목록(기본: 개방/부분통제/통제/정보없음) */
  statuses?: TrailStatus[];
  /** 함께 표시할 편의시설 유형(마커가 있을 때). 생략 시 편의시설 범례 미노출 */
  facilities?: FacilityType[];
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="지도 범례"
      className={cn("rounded-lg border bg-card/90 p-3 shadow-sm backdrop-blur", className)}
    >
      <p className="mb-2 text-xs font-semibold text-muted-foreground">탐방로 범례</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {statuses.map((status) => {
          const { icon: Icon, dot, text } = STATUS_LEGEND[status];
          return (
            <li key={status} className="flex items-center gap-1.5 text-xs">
              <span className={cn("size-2.5 rounded-full", dot)} aria-hidden="true" />
              <Icon className={cn("size-3.5", text)} aria-hidden="true" />
              <span className="text-foreground">{TRAIL_STATUS_LABEL[status]}</span>
            </li>
          );
        })}
      </ul>

      {facilities && facilities.length > 0 ? (
        <>
          <p className="mt-2.5 mb-2 text-xs font-semibold text-muted-foreground">편의시설</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {facilities.map((type) => {
              const { color } = FACILITY_MARKER_STYLE[type];
              const Icon = FACILITY_ICON[type];
              return (
                <li key={type} className="flex items-center gap-1.5 text-xs">
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: color }}
                    className="flex size-4 items-center justify-center rounded-full text-white"
                  >
                    <Icon className="size-2.5" strokeWidth={2.5} />
                  </span>
                  <span className="text-foreground">{FACILITY_TYPE_LABEL[type]}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] leading-tight text-muted-foreground">
            <span
              aria-hidden="true"
              className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-white bg-slate-700 text-[9px] font-bold text-white"
            >
              N
            </span>
            숫자 = 이 구역 편의시설 개수 · 지도를 확대하면 개별 표시
          </p>
        </>
      ) : null}
    </div>
  );
}
