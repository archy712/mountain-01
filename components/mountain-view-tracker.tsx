"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

/**
 * 산 상세 조회 계측 (Task 035).
 *
 * 상세 페이지 진입 시 `mountain_view` 를 1회 기록한다(검색 완료율 검증·즐겨찾기 비율 분모).
 * 렌더 출력은 없다. `mountainId` 가 바뀌면(라우팅으로 다른 산으로 이동) 다시 기록한다.
 */
export function MountainViewTracker({ mountainId }: { mountainId: string }) {
  useEffect(() => {
    track("mountain_view", { mountainId });
  }, [mountainId]);

  return null;
}
