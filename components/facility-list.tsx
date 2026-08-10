"use client";

import { useEffect, useRef } from "react";
import {
  Accessibility,
  Droplets,
  MapPin,
  Store,
  TentTree,
  Toilet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useFacilitySelection } from "@/components/facility-selection";
import { FacilityFilterChips } from "@/components/facility-filter-chips";
import { FACILITY_TYPE_LABEL, type Facility, type FacilityType } from "@/lib/types";

/**
 * 편의시설 목록 섹션 (Task 045 → 유형 필터 + 지도 연동 개편).
 *
 * `FacilitySelectionProvider` 를 구독해 지도 마커와 **동일한 시설·필터·선택 상태**를 공유한다.
 * 행을 누르면 지도가 해당 핀으로 이동·확대하고(리스트→지도), 지도 마커를 누르면 이 목록이
 * 해당 행으로 스크롤·강조한다(지도→리스트). 유형 필터 칩은 목록과 지도를 동시에 좁힌다.
 *
 * 접근성: 유형 요약은 아이콘 + 텍스트("화장실 N곳")를 병기하고(아이콘 단독 금지), 장애인 편의는
 * 아이콘 + sr-only 라벨로 제공한다. 활성 행은 색 + 굵기 + 좌측 바로 강조(색 단독 금지). 긴 목록은
 * 스크롤 컨테이너로 담아 페이지를 밀지 않는다. 프로바이더 밖이거나 데이터 없으면 렌더하지 않는다.
 */

const TYPE_ICON: Record<FacilityType, LucideIcon> = {
  toilet: Toilet,
  shelter: TentTree,
  spring: Droplets,
  shop: Store,
};

/** 유형 표시 순서(선언 순). */
const TYPE_ORDER: FacilityType[] = ["toilet", "shelter", "spring", "shop"];

export function FacilityList() {
  const ctx = useFacilitySelection();
  const rowRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const selection = ctx?.selection;
  const activeId = ctx?.activeId ?? null;

  // 지도 마커를 눌러 선택이 바뀌면(source: "map") 해당 행을 목록에서 스크롤·강조한다.
  useEffect(() => {
    if (!selection || selection.source !== "map" || !selection.id) return;
    const row = rowRefs.current.get(selection.id);
    if (!row) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [selection]);

  if (!ctx || ctx.facilities.length === 0) return null;

  const { visibleFacilities, select } = ctx;
  const groups = TYPE_ORDER.map((type) => ({
    type,
    items: visibleFacilities.filter((f) => f.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <section aria-labelledby="facility-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="facility-heading" className="text-base font-semibold">
          편의시설
        </h2>
        <FacilityFilterChips />
      </div>
      <div className="space-y-4 rounded-lg border p-4">
        {groups.map(({ type, items }) => {
          const Icon = TYPE_ICON[type];
          const accessibleCount = items.filter((f) => f.accessible).length;
          return (
            <div key={type} className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {FACILITY_TYPE_LABEL[type]} {items.length}곳
                {accessibleCount > 0 ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    · 장애인 편의 {accessibleCount}곳
                  </span>
                ) : null}
              </p>
              <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {items.map((f) => (
                  <FacilityRow
                    key={f.id}
                    facility={f}
                    active={f.id === activeId}
                    onSelect={() => select(f.id, "list")}
                    rowRef={(el) => {
                      if (el) rowRefs.current.set(f.id, el);
                      else rowRefs.current.delete(f.id);
                    }}
                  />
                ))}
              </ul>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">출처: 국립공원공단 · 정적 스냅샷</p>
      </div>
    </section>
  );
}

function FacilityRow({
  facility: f,
  active,
  onSelect,
  rowRef,
}: {
  facility: Facility;
  active: boolean;
  onSelect: () => void;
  rowRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <li>
      <button
        ref={rowRef}
        type="button"
        aria-pressed={active}
        aria-label={`${f.name} 지도에서 보기`}
        onClick={onSelect}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border-l-2 px-3 py-1.5 text-left text-sm transition-colors",
          active
            ? "border-primary bg-primary/10 font-medium"
            : "border-transparent bg-muted/40 hover:bg-accent",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin
            className={cn(
              "size-3.5 shrink-0",
              active ? "text-primary" : "text-muted-foreground/60",
            )}
            aria-hidden="true"
          />
          <span className="truncate">{f.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          {f.capacity != null && f.capacity > 0 ? (
            <span className="tabular-nums">{f.capacity}명</span>
          ) : null}
          {f.elevation != null ? <span className="tabular-nums">{f.elevation}m</span> : null}
          {f.accessible ? (
            <span className="flex items-center text-foreground" title="장애인 편의">
              <Accessibility className="size-3.5" aria-hidden="true" />
              <span className="sr-only">장애인 편의</span>
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
