"use client";

import { TrailStatusBadge } from "@/components/trail-status-badge";
import { useTrailSelection } from "@/components/trail-selection";
import { TRAIL_HIGHLIGHT_COLOR } from "@/lib/trails/colors";
import { cn } from "@/lib/utils";
import { trailDifficultyLabel, type Trail } from "@/lib/types";

/** 거리(m) → "2.9km" / "820m". 미상이면 null. */
function formatDistance(m: number | null): string | null {
  if (m == null || m <= 0) return null;
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

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

  return (
    <ul className="space-y-2">
      {trails.map((trail) => {
        // 코스 정보(거리·소요시간·난이도) 요약 칩 (Task 033 #4).
        const difficultyLabel = trailDifficultyLabel(trail.difficulty);
        const goText = formatMinutes(trail.goMinutes);
        const meta = [
          formatDistance(trail.distanceM),
          goText ? `오름 ${goText}` : null,
          difficultyLabel ? `난이도 ${difficultyLabel}` : null,
        ].filter((v): v is string => Boolean(v));

        const body = (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{trail.name}</span>
              <TrailStatusBadge status={trail.status} size="sm" />
            </div>
            {meta.length > 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">{meta.join(" · ")}</p>
            ) : null}
            {trail.waypoints ? (
              <p className="mt-1 truncate text-xs text-muted-foreground/80" title={trail.waypoints}>
                {trail.waypoints}
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

        // 지도에 대응 선이 없으면 정적 항목(기존과 동일).
        if (!availableIds.has(trail.id)) {
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
