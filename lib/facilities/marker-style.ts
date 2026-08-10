/**
 * 편의시설 지도 마커의 시각 스타일 (Task 045). 지도 마커(`components/facility-markers.tsx`)와
 * 범례(`components/map-legend.tsx`)가 **같은 색·모양**을 쓰도록 단일 출처로 둔다.
 *
 * 접근성: 색상 단독으로 유형을 구분하지 않는다 — 모양(원/사각)도 다르게 하고, 범례(라벨)와
 * 마커 클릭 InfoWindow(시설명·유형)로 의미를 함께 전달한다.
 */

import type { FacilityType } from "@/lib/types";

export interface FacilityMarkerStyle {
  color: string;
  shape: "circle" | "square";
}

export const FACILITY_MARKER_STYLE: Record<FacilityType, FacilityMarkerStyle> = {
  toilet: { color: "#2563eb", shape: "circle" }, // 파랑 원
  shelter: { color: "#16a34a", shape: "square" }, // 초록 사각
  spring: { color: "#0891b2", shape: "circle" }, // 청록 원
  shop: { color: "#d97706", shape: "square" }, // 주황 사각
};

/** 유형별 마커 아이콘을 SVG data URI 로 만든다(18×18, 중앙 기준). */
export function facilityMarkerSvg(type: FacilityType): string {
  const { color, shape } = FACILITY_MARKER_STYLE[type];
  const body =
    shape === "circle"
      ? `<circle cx="9" cy="9" r="6.5" fill="${color}" stroke="#fff" stroke-width="2"/>`
      : `<rect x="2.5" y="2.5" width="13" height="13" rx="3" fill="${color}" stroke="#fff" stroke-width="2"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
