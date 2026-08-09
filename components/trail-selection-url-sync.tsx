"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { useTrailSelection } from "@/components/trail-selection";

/**
 * URL `?trail=<id>` 파라미터로 초기 선택을 복원한다 (Task 033 후속).
 *
 * 전체화면 지도는 상세와 별도 라우트라 선택 상태를 직접 넘길 수 없다. 상세의 "전체화면"
 * 링크가 붙여 보낸 `trail` 쿼리를 읽어, 마운트 시 1회만 해당 코스를 선택한다(오버레이가
 * 이후 강조·프레이밍을 적용). `useSearchParams` 사용을 이 컴포넌트에 국한하고 <Suspense>
 * 로 감싸, 지도 셸의 정적 프리렌더를 해치지 않는다. 아무것도 렌더하지 않는다.
 */
export function TrailSelectionUrlSync() {
  const trail = useSearchParams().get("trail");
  const { select } = useTrailSelection();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !trail) return;
    applied.current = true; // 최초 1회만(select 는 토글이라 중복 호출 방지)
    select(trail);
  }, [trail, select]);

  return null;
}
