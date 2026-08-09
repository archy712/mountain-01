"use client";

import { useEffect, useRef } from "react";

import { useKakaoMapHandle } from "@/components/kakao-map";
import { useTrailSelection } from "@/components/trail-selection";
import { TRAIL_HIGHLIGHT_COLOR, TRAIL_STATUS_COLOR } from "@/lib/trails/colors";
import type { TrailPath } from "@/lib/types";

/**
 * 등산로 폴리라인 오버레이 (Task 029 → Task 032 선택 강조).
 *
 * `KakaoMap` 이 컨텍스트로 공개한 지도 핸들을 구독해, 각 등산로의 MultiLineString 을
 * 카카오맵 폴리라인으로 그린다. 카카오맵은 명령형 API 라 폴리라인을 `useEffect` 에서
 * 생성하고 언마운트/변경 시 `setMap(null)` 로 정리한다(지도 준비 전에는 아무것도 안 함).
 *
 * **통제 구간 색상 구분(색상 단독 금지 원칙 준수)**: 폴리라인 색은 아래 `TRAIL_STATUS_COLOR`
 * 로 상태를 구분하되, 의미 전달은 `MapLegend`(아이콘+텍스트 병기)가 함께 책임진다. 색상 값은
 * `app/globals.css` 의 `--status-*` HSL 토큰과 동일한 색을 hex 로 옮긴 것이다(범례 점과 일치).
 *
 * **선택 강조(Task 032)**: 탐방로가 여러 개면 어느 선이 어느 코스인지 알기 어렵다. 목록 클릭
 * 또는 폴리라인 클릭으로 `TrailSelectionProvider` 의 선택 상태를 토글하고, 선택된 탐방로는
 * 강조색(`--trail-highlight`)·굵은 선·상단 배치로 부각하며 나머지는 흐리게 낮춘다. 재생성 없이
 * `setOptions`/`setZIndex` 로 스타일만 갱신해 깜빡임을 없앤다. 선택 시 이름 라벨(CustomOverlay)을
 * 코스 중앙에 띄워 목록이 없는 전체화면 지도에서도 코스를 식별할 수 있게 한다.
 *
 * 색상 상수(`TRAIL_STATUS_COLOR`·`TRAIL_HIGHLIGHT_COLOR`)는 리스트 선택 표시와 공유하도록
 * `lib/trails/colors.ts` 에 단일 출처로 두었다.
 */

/** 여러 세그먼트 중 가장 긴 선의 가운데 점을 라벨 위치로 고른다. */
function labelPointOf(paths: [number, number][][]): [number, number] | null {
  let longest: [number, number][] | null = null;
  for (const seg of paths) {
    if (!longest || seg.length > longest.length) longest = seg;
  }
  if (!longest || longest.length === 0) return null;
  return longest[Math.floor(longest.length / 2)];
}

export function TrailOverlay({ trails }: { trails: TrailPath[] }) {
  const handle = useKakaoMapHandle();
  const { selectedId, select, registerIds } = useTrailSelection();

  // 폴리라인 인스턴스를 trailId 별로 보관해, 선택 변경 시 재생성 없이 스타일만 갱신한다.
  const groupsRef = useRef<Map<string, kakao.maps.Polyline[]>>(new Map());
  const labelRef = useRef<kakao.maps.CustomOverlay | null>(null);
  // 선택 해제 시 되돌릴 초기 중심/레벨(지도 준비 시 1회 저장).
  const initialViewRef = useRef<{ center: kakao.maps.LatLng; level: number } | null>(null);

  // 폴리라인 생성/정리 — 지도·경로가 바뀔 때만 실행한다.
  useEffect(() => {
    if (!handle) return;
    const { kakao, map } = handle;

    // 선택 해제 시 복원할 초기 뷰를 1회 저장한다(마커 중심·초기 레벨).
    if (!initialViewRef.current) {
      initialViewRef.current = { center: map.getCenter(), level: map.getLevel() };
    }

    const groups = new Map<string, kakao.maps.Polyline[]>();
    for (const trail of trails) {
      const polylines: kakao.maps.Polyline[] = [];
      for (const segment of trail.paths) {
        const path = segment.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng));
        const polyline = new kakao.maps.Polyline({
          path,
          strokeWeight: 4,
          strokeColor: TRAIL_STATUS_COLOR[trail.status],
          strokeOpacity: 0.9,
          strokeStyle: "solid",
        });
        polyline.setMap(map);
        // 선을 직접 클릭해도 선택되게 한다(목록↔지도 양방향).
        kakao.maps.event.addListener(polyline, "click", () => select(trail.id));
        polylines.push(polyline);
      }
      if (polylines.length > 0) groups.set(trail.id, polylines);
    }
    groupsRef.current = groups;
    // 지도에 실제로 그려진 탐방로만 목록에서 클릭 가능하도록 등록한다.
    registerIds([...groups.keys()]);

    return () => {
      for (const polylines of groups.values()) {
        for (const p of polylines) p.setMap(null);
      }
      groups.clear();
      groupsRef.current = new Map();
      if (labelRef.current) {
        labelRef.current.setMap(null);
        labelRef.current = null;
      }
    };
  }, [handle, trails, select, registerIds]);

  // 선택 상태에 따라 스타일·순서·이름 라벨을 갱신한다(폴리라인은 그대로 재사용).
  useEffect(() => {
    if (!handle) return;
    const { kakao, map } = handle;
    const groups = groupsRef.current;

    // 선택 id 가 실제 존재하는 코스일 때만 나머지를 흐리게 한다(잘못된 URL 파라미터 등으로
    // 전부 흐려지는 것을 방지).
    const hasValidSelection = selectedId !== null && trails.some((t) => t.id === selectedId);
    for (const trail of trails) {
      const polylines = groups.get(trail.id);
      if (!polylines) continue;
      const isSelected = trail.id === selectedId;
      const dimmed = hasValidSelection && !isSelected;
      for (const p of polylines) {
        p.setOptions({
          strokeColor: isSelected ? TRAIL_HIGHLIGHT_COLOR : TRAIL_STATUS_COLOR[trail.status],
          strokeWeight: isSelected ? 7 : 4,
          strokeOpacity: dimmed ? 0.3 : isSelected ? 1 : 0.9,
        });
        p.setZIndex(isSelected ? 100 : dimmed ? 1 : 10);
      }
    }

    // 선택 시 해당 코스가 화면에 꽉 차도록 지도를 맞추고, 해제 시 초기 뷰로 되돌린다.
    // (확대 시 코스가 화면 밖으로 밀려 "안 그려지는 것처럼" 보이던 문제 대응.)
    const selectedTrail = selectedId ? trails.find((t) => t.id === selectedId) : null;
    if (selectedTrail) {
      const bounds = new kakao.maps.LatLngBounds();
      for (const seg of selectedTrail.paths) {
        for (const [lng, lat] of seg) bounds.extend(new kakao.maps.LatLng(lat, lng));
      }
      if (!bounds.isEmpty()) map.setBounds(bounds, 48, 48, 48, 48);
    } else if (initialViewRef.current) {
      map.setLevel(initialViewRef.current.level);
      map.setCenter(initialViewRef.current.center);
    }

    // 이전 라벨 제거 후 선택된 탐방로 이름 라벨을 다시 그린다.
    if (labelRef.current) {
      labelRef.current.setMap(null);
      labelRef.current = null;
    }
    if (selectedTrail) {
      const point = labelPointOf(selectedTrail.paths);
      if (point) {
        const [lng, lat] = point;
        const content = document.createElement("div");
        content.textContent = selectedTrail.name;
        // Tailwind 퍼지에 걸리지 않도록 인라인 스타일로 자족적으로 스타일링한다.
        content.style.cssText = [
          "padding:3px 10px",
          "border-radius:9999px",
          `background:${TRAIL_HIGHLIGHT_COLOR}`,
          "color:#fff",
          "font-size:12px",
          "font-weight:600",
          "white-space:nowrap",
          "box-shadow:0 1px 4px rgba(0,0,0,.35)",
          "transform:translateY(-6px)",
          "pointer-events:none",
        ].join(";");
        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(lat, lng),
          content,
          yAnchor: 1,
          zIndex: 200,
        });
        overlay.setMap(map);
        labelRef.current = overlay;
      }
    }
  }, [handle, trails, selectedId]);

  return null;
}
