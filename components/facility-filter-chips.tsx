"use client";

import { Droplets, Store, TentTree, Toilet, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFacilitySelection } from "@/components/facility-selection";
import { FACILITY_TYPE_LABEL, type FacilityType } from "@/lib/types";

/**
 * 편의시설 유형 필터 칩 (지도·편의시설 UI 개편). 지도 마커와 리스트를 **동시에** 필터한다.
 * 데이터에 실제 존재하는 유형만 칩으로 노출하고, "전체" 칩으로 해제한다. 색상 단독 금지 원칙에
 * 따라 아이콘 + 라벨을 병기한다. 프로바이더 밖(컨텍스트 null)이면 아무것도 렌더하지 않는다.
 */

const TYPE_ICON: Record<FacilityType, LucideIcon> = {
  toilet: Toilet,
  shelter: TentTree,
  spring: Droplets,
  shop: Store,
};

export function FacilityFilterChips({ className }: { className?: string }) {
  const ctx = useFacilitySelection();
  if (!ctx || ctx.availableTypes.length < 2) return null;

  const { availableTypes, typeFilter, setTypeFilter } = ctx;

  return (
    <div
      role="group"
      aria-label="편의시설 유형 필터"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      <Chip active={typeFilter === null} onClick={() => setTypeFilter(null)} label="전체" />
      {availableTypes.map((type) => {
        const Icon = TYPE_ICON[type];
        return (
          <Chip
            key={type}
            active={typeFilter === type}
            onClick={() => setTypeFilter(typeFilter === type ? null : type)}
            label={FACILITY_TYPE_LABEL[type]}
            icon={Icon}
          />
        );
      })}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-accent",
      )}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}
