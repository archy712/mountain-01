"use client";

import { useEffect } from "react";

import { useKakaoMapHandle } from "@/components/kakao-map";
import type { TrailPath, TrailStatus } from "@/lib/types";

/**
 * 등산로 폴리라인 오버레이 (Task 029, Phase 5).
 *
 * `KakaoMap` 이 컨텍스트로 공개한 지도 핸들을 구독해, 각 등산로의 MultiLineString 을
 * 카카오맵 폴리라인으로 그린다. 카카오맵은 명령형 API 라 폴리라인을 `useEffect` 에서
 * 생성하고 언마운트/변경 시 `setMap(null)` 로 정리한다(지도 준비 전에는 아무것도 안 함).
 *
 * **통제 구간 색상 구분(색상 단독 금지 원칙 준수)**: 폴리라인 색은 아래 `TRAIL_STATUS_COLOR`
 * 로 상태를 구분하되, 의미 전달은 `MapLegend`(아이콘+텍스트 병기)가 함께 책임진다. 색상 값은
 * `app/globals.css` 의 `--status-*` HSL 토큰과 동일한 색을 hex 로 옮긴 것이다(범례 점과 일치).
 */

/** 상태별 폴리라인 색(= --status-* 토큰의 라이트 모드 hex). MapLegend 점 색과 일치. */
export const TRAIL_STATUS_COLOR: Record<TrailStatus, string> = {
  open: "#1da54f", // 142 70% 38%
  closed: "#d32222", // 0 72% 48%
  partial: "#ce7c09", // 35 92% 42%
  unknown: "#737373", // 0 0% 45%
};

export function TrailOverlay({ trails }: { trails: TrailPath[] }) {
  const handle = useKakaoMapHandle();

  useEffect(() => {
    if (!handle) return;
    const { kakao, map } = handle;

    // 통제(closed)·부분통제(partial)를 개방(open) 위에 그리도록 정렬 → 제약 구간이 가려지지 않음.
    const order: Record<TrailStatus, number> = { open: 0, unknown: 1, partial: 2, closed: 3 };
    const sorted = [...trails].sort((a, b) => order[a.status] - order[b.status]);

    const polylines: kakao.maps.Polyline[] = [];
    for (const trail of sorted) {
      const color = TRAIL_STATUS_COLOR[trail.status];
      for (const segment of trail.paths) {
        const path = segment.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng));
        const polyline = new kakao.maps.Polyline({
          path,
          strokeWeight: 4,
          strokeColor: color,
          strokeOpacity: 0.9,
          strokeStyle: "solid",
        });
        polyline.setMap(map);
        polylines.push(polyline);
      }
    }

    return () => {
      for (const p of polylines) p.setMap(null);
    };
  }, [handle, trails]);

  return null;
}
