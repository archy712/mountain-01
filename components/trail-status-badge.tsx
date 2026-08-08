import { CircleAlert, CircleCheck, CircleHelp, CircleSlash, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { TRAIL_STATUS_LABEL, type TrailStatus } from "@/lib/types";

/**
 * 탐방로 개방 상태 배지.
 *
 * 접근성 원칙(결정 001 #4): **색상 단독으로 상태를 구분하지 않는다.**
 * 항상 상태별 아이콘 + 한국어 라벨(`TRAIL_STATUS_LABEL`)을 함께 노출한다.
 */

const STATUS_CONFIG: Record<TrailStatus, { icon: LucideIcon; className: string }> = {
  open: {
    icon: CircleCheck,
    className: "border-status-open/30 bg-status-open/10 text-status-open",
  },
  closed: {
    icon: CircleSlash,
    className: "border-status-closed/30 bg-status-closed/10 text-status-closed",
  },
  partial: {
    icon: CircleAlert,
    className: "border-status-partial/30 bg-status-partial/10 text-status-partial",
  },
  unknown: {
    icon: CircleHelp,
    className: "border-status-unknown/30 bg-status-unknown/10 text-status-unknown",
  },
};

const SIZE_CONFIG = {
  sm: { badge: "gap-1 px-2 py-0.5 text-xs", icon: "size-3.5" },
  md: { badge: "gap-1.5 px-2.5 py-1 text-sm", icon: "size-4" },
} as const;

export interface TrailStatusBadgeProps {
  status: TrailStatus;
  size?: keyof typeof SIZE_CONFIG;
  className?: string;
}

export function TrailStatusBadge({ status, size = "md", className }: TrailStatusBadgeProps) {
  const { icon: Icon, className: statusClassName } = STATUS_CONFIG[status];
  const sizeClassName = SIZE_CONFIG[size];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        statusClassName,
        sizeClassName.badge,
        className,
      )}
    >
      <Icon className={sizeClassName.icon} aria-hidden="true" />
      {TRAIL_STATUS_LABEL[status]}
    </span>
  );
}
