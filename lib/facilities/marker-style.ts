/**
 * 편의시설 지도 마커의 시각 스타일 (Task 045 → 유형 아이콘 핀 개편).
 *
 * 지도 마커(`components/facility-markers.tsx`)·범례(`components/map-legend.tsx`)·리스트
 * (`components/facility-list.tsx`)가 **같은 색·아이콘**을 쓰도록 단일 출처로 둔다.
 *
 * 접근성(색상 단독 금지): 유형은 색 + **아이콘 모양**(화장실·대피소·식수대·매점)으로 구분하고,
 * 범례 라벨과 마커 클릭 InfoWindow(시설명·유형)로 의미를 함께 전달한다. 마커는 밋밋한 점이
 * 아니라 **아이콘이 든 물방울 핀**이라, 확대했을 때 "이게 무엇인지"가 지도만 봐도 읽힌다.
 */

import type { FacilityType } from "@/lib/types";

export interface FacilityMarkerStyle {
  color: string;
  /** lucide 아이콘 이름(범례에서 동일 아이콘을 렌더) */
  icon: FacilityType;
}

export const FACILITY_MARKER_STYLE: Record<FacilityType, { color: string }> = {
  toilet: { color: "#2563eb" }, // 파랑
  shelter: { color: "#16a34a" }, // 초록
  spring: { color: "#0891b2" }, // 청록
  shop: { color: "#d97706" }, // 주황
};

/**
 * 유형별 아이콘 패스(lucide-react v1, 24×24 viewBox, stroke 기반). 마커 핀 안에 흰색 글리프로
 * 그린다. 리스트/범례는 lucide 컴포넌트를 쓰고, 지도 마커만 SVG 문자열이 필요해 여기 둔다.
 */
const ICON_PATHS: Record<FacilityType, string> = {
  toilet:
    '<path d="M7 12h13a1 1 0 0 1 1 1 5 5 0 0 1-5 5h-.598a.5.5 0 0 0-.424.765l1.544 2.47a.5.5 0 0 1-.424.765H5.402a.5.5 0 0 1-.424-.765L7 18"/><path d="M8 18a5 5 0 0 1-5-5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8"/>',
  shelter:
    '<circle cx="4" cy="4" r="2"/><path d="m14 5 3-3 3 3"/><path d="m14 10 3-3 3 3"/><path d="M17 14V2"/><path d="M17 14H7l-5 8h20Z"/><path d="M8 14v8"/><path d="m9 14 5 8"/>',
  spring:
    '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>',
  shop: '<path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/>',
};

/** 마커 크기 상수(핀 폭·높이·바닥 꼭짓점 기준점). 선택 시 1.28배로 키운다. */
export const MARKER_SIZE = { w: 30, h: 38 } as const;
export const MARKER_SIZE_ACTIVE = { w: 38, h: 48 } as const;

/**
 * 유형별 아이콘 핀 마커를 SVG data URI 로 만든다. 물방울(핀) 몸통 + 흰 테두리 + 중앙 흰색
 * 아이콘 글리프. 바닥 꼭짓점이 좌표를 가리키도록 anchor 는 (w/2, h) 이다.
 * @param active 선택 강조(더 크게 + 그림자 링)
 */
export function facilityMarkerSvg(type: FacilityType, active = false): string {
  const { color } = FACILITY_MARKER_STYLE[type];
  const { w, h } = active ? MARKER_SIZE_ACTIVE : MARKER_SIZE;
  const cx = w / 2;
  // 핀 머리 반지름 = 폭의 약 40%, 아이콘은 머리 중심에 24px 글리프를 축소 배치한다.
  const r = w * 0.4;
  const headCy = r + 2;
  const glyphScale = (r * 1.15) / 24;
  const glyphTx = cx - (24 * glyphScale) / 2;
  const glyphTy = headCy - (24 * glyphScale) / 2;
  // 물방울 경로: 머리 원 + 아래로 모이는 꼬리.
  const body = [
    `M ${cx} ${h - 1}`,
    `C ${cx - r * 0.55} ${h - r * 1.1} ${cx - r} ${headCy + r * 0.7} ${cx - r} ${headCy}`,
    `a ${r} ${r} 0 1 1 ${r * 2} 0`,
    `c 0 ${r * 0.7 - 0} ${-r * 0.45} ${r * 1.1 - r * 0.4} ${-r} ${h - 1 - headCy}`,
    "Z",
  ].join(" ");
  const shadow = active
    ? `<ellipse cx="${cx}" cy="${h - 1}" rx="${r * 0.7}" ry="2.5" fill="rgba(0,0,0,0.25)"/>`
    : "";
  const ring = active
    ? `<path d="${body}" fill="none" stroke="#fff" stroke-width="4.5" opacity="0.55"/>`
    : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    shadow +
    ring +
    `<path d="${body}" fill="${color}" stroke="#fff" stroke-width="2"/>` +
    `<g transform="translate(${glyphTx.toFixed(2)} ${glyphTy.toFixed(2)}) scale(${glyphScale.toFixed(3)})" ` +
    `fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">` +
    ICON_PATHS[type] +
    "</g></svg>";
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
