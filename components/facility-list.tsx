import { Accessibility, Droplets, Store, TentTree, Toilet, type LucideIcon } from "lucide-react";

import { FACILITY_TYPE_LABEL, type Facility, type FacilityType } from "@/lib/types";

/**
 * 편의시설 목록 섹션 (Task 045, 1차 화장실 범위).
 *
 * 국립공원공단 정적 시드(위치 포함)를 유형별로 묶어 명칭·고도·장애인 편의 유무와 함께
 * 노출한다. 데이터가 없는 산(국립공원 외)은 **섹션 자체를 렌더하지 않는다**(상위에서 폴백 불필요).
 *
 * 접근성: 유형 요약은 아이콘 + **텍스트("화장실 N곳")** 를 병기하고(아이콘 단독 금지),
 * 장애인 편의는 아이콘 + sr-only 라벨로 제공한다. 긴 목록은 스크롤 컨테이너로 담아
 * 페이지를 밀지 않는다.
 */

const TYPE_ICON: Record<FacilityType, LucideIcon> = {
  toilet: Toilet,
  shelter: TentTree,
  spring: Droplets,
  shop: Store,
};

/** 유형 표시 순서(선언 순). 현재는 화장실만 존재. */
const TYPE_ORDER: FacilityType[] = ["toilet", "shelter", "spring", "shop"];

export function FacilityList({ facilities }: { facilities: Facility[] }) {
  if (facilities.length === 0) return null;

  const groups = TYPE_ORDER.map((type) => ({
    type,
    items: facilities.filter((f) => f.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <section aria-labelledby="facility-heading" className="space-y-3">
      <h2 id="facility-heading" className="text-base font-semibold">
        편의시설
      </h2>
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
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-1.5 text-sm"
                  >
                    <span className="truncate">{f.name}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {f.capacity != null && f.capacity > 0 ? (
                        <span className="tabular-nums">{f.capacity}명</span>
                      ) : null}
                      {f.elevation != null ? (
                        <span className="tabular-nums">{f.elevation}m</span>
                      ) : null}
                      {f.accessible ? (
                        <span className="flex items-center text-foreground" title="장애인 편의">
                          <Accessibility className="size-3.5" aria-hidden="true" />
                          <span className="sr-only">장애인 편의</span>
                        </span>
                      ) : null}
                    </span>
                  </li>
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
