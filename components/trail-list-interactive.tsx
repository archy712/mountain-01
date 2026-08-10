"use client";

import { useSyncExternalStore } from "react";
import { MapPinOff, Split } from "lucide-react";

import { TrailDifficulty } from "@/components/trail-difficulty";
import { TrailStatusBadge } from "@/components/trail-status-badge";
import { useTrailSelection } from "@/components/trail-selection";
import { TRAIL_HIGHLIGHT_COLOR } from "@/lib/trails/colors";
import { isSpurTrail } from "@/lib/trails/spurs";
import { cn } from "@/lib/utils";
import { type Trail } from "@/lib/types";

/** 거리(m) → "2.9km" / "820m". 미상이면 null. */
function formatDistance(m: number | null): string | null {
  if (m == null || m <= 0) return null;
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

// 하이드레이션 여부 감지(외부 스토어 없이). 서버 스냅샷=false 로 첫 렌더를 SSR 과 일치시키고,
// 하이드레이션 후 클라이언트 스냅샷=true 로 바뀐다(useSyncExternalStore 는 하이드레이션 안전).
const subscribeNoop = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

/** 분 → "1시간 55분" / "40분". 미상이면 null. */
function formatMinutes(min: number | null): string | null {
  if (min == null || min <= 0) return null;
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

/**
 * 탐방로 목록의 인터랙티브 렌더 (Task 032).
 *
 * 지도에 폴리라인이 그려진 탐방로(`availableIds`)는 클릭 가능한 버튼으로 렌더해, 클릭 시
 * 지도의 해당 선을 강조색으로 부각한다(목록↔지도 양방향 선택). 대응 선이 없는 탐방로(GeoJSON
 * 미보유)는 죽은 클릭을 피하려고 기존처럼 정적 항목으로 둔다. 선택된 항목은 좌측 강조색 바 +
 * 배경/링으로 표시해 지도의 파란 강조선과 시각적으로 연결한다.
 *
 * 선택 상태의 계산·표시는 클라이언트지만, 데이터(`Trail[]`)는 서버(`TrailList`)에서 스트리밍된
 * 값을 그대로 받는다(부분 실패/빈 목록/stale 분기는 상위 `TrailList` 가 담당).
 */
export function TrailListInteractive({ trails }: { trails: Trail[] }) {
  const { selectedId, select, availableIds } = useTrailSelection();

  // `availableIds` 는 지도 오버레이가 **클라이언트에서 마운트된 뒤** 등록한다(카카오맵은 클라이언트
  // 전용이라 서버 렌더에는 항상 비어 있음 → 모든 행이 정적 <li>). 스트리밍 순서에 따라 오버레이의
  // 등록이 이 목록의 하이드레이션보다 먼저 일어나면, 서버가 <li> 로 그린 행을 클라이언트가 <button>
  // 으로 렌더해 하이드레이션 불일치가 난다. 첫 클라이언트 렌더를 서버와 동일하게(모두 정적) 맞춘 뒤
  // 하이드레이션 후에만 버튼으로 업그레이드해 불일치를 없앤다.
  const hydrated = useSyncExternalStore(subscribeNoop, getHydratedSnapshot, getServerSnapshot);

  return (
    <ul className="space-y-2">
      {trails.map((trail) => {
        // 코스 정보(거리·소요시간) 요약 칩 (Task 033 #4). 난이도는 별점으로 별도 표시(Task 034).
        const goText = formatMinutes(trail.goMinutes);
        const meta = [formatDistance(trail.distanceM), goText ? `오름 ${goText}` : null].filter(
          (v): v is string => Boolean(v),
        );
        // 본선 갈림길에서 갈라지는 지선(곁길)은 배지+캡션으로 맥락을 준다(Task 034, 큐레이션).
        const spur = isSpurTrail(trail.name);

        const body = (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate font-medium">{trail.name}</span>
                {spur ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Split className="size-3" aria-hidden="true" />
                    지선
                  </span>
                ) : null}
              </span>
              <TrailStatusBadge status={trail.status} size="sm" />
            </div>
            {meta.length > 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">{meta.join(" · ")}</p>
            ) : null}
            <div className="mt-1.5">
              <TrailDifficulty goMinutes={trail.goMinutes} />
            </div>
            {spur ? (
              <p className="mt-1.5 text-xs text-muted-foreground/80">
                본선 탐방로 중간 갈림길에서 갈라지는 지선이에요. 거리·시간은 갈림길 기준이라
                들머리부터는 더 걸려요.
              </p>
            ) : null}
            {trail.waypoints ? (
              <p className="mt-1 truncate text-xs text-muted-foreground/80" title={trail.waypoints}>
                {trail.waypoints}
              </p>
            ) : null}
            {/* 경로 지오메트리(path_geojson)가 없는 코스는 지도에 선이 없어 클릭(강조)이 안 된다.
                왜 반응이 없는지 사용자가 알 수 있게 캡션으로 안내한다(서버 판정값이라 SSR 안전). */}
            {!trail.hasPath ? (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground/80">
                <MapPinOff className="size-3 shrink-0" aria-hidden="true" />
                지도 경로 미제공 · 목록에서 위치 확인만 가능
              </p>
            ) : null}
            {trail.closedReason || trail.closedPeriod ? (
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {trail.closedReason ? <p>{trail.closedReason}</p> : null}
                {trail.closedPeriod ? <p>통제 기간: {trail.closedPeriod}</p> : null}
              </div>
            ) : null}
          </>
        );

        // 하이드레이션 전(SSR·첫 클라이언트 렌더)이거나 지도에 대응 선이 없으면 정적 항목.
        if (!hydrated || !availableIds.has(trail.id)) {
          return (
            <li key={trail.id} className="rounded-lg border p-3">
              {body}
            </li>
          );
        }

        const selected = selectedId === trail.id;
        return (
          <li key={trail.id}>
            <button
              type="button"
              onClick={() => {
                const willSelect = !selected;
                select(trail.id);
                // 코스 선택 시 지도로 부드럽게 스크롤한다(코스 많은 산에서 지도가 화면 밖인
                // 문제 대응, Task 033 #1). 해제(토글 오프) 때는 스크롤하지 않는다.
                if (willSelect) {
                  document
                    .getElementById("trail-map-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              aria-pressed={selected}
              aria-label={`${trail.name} 탐방로 지도에서 강조`}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                selected && "bg-accent",
              )}
              // 좌측 강조바는 인라인 스타일로 그린다: 지도 폴리라인과 정확히 같은 hex 를 쓰고,
              // Tailwind 유틸 재생성에 의존하지 않는다. 4px 폭을 항상 유지해(색만 토글) 선택
              // 전환 시 레이아웃 이동이 없다.
              style={{
                borderLeftWidth: "4px",
                borderLeftColor: selected ? TRAIL_HIGHLIGHT_COLOR : "transparent",
              }}
            >
              {body}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
