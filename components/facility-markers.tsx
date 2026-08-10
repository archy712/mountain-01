"use client";

import { useEffect, useMemo, useRef } from "react";

import { useKakaoMapHandle } from "@/components/kakao-map";
import { useFacilitySelection } from "@/components/facility-selection";
import { facilityMarkerSvg, MARKER_SIZE, MARKER_SIZE_ACTIVE } from "@/lib/facilities/marker-style";
import { FACILITY_TYPE_LABEL, type Facility, type FacilityType } from "@/lib/types";

/**
 * 편의시설 지도 마커 오버레이 (Task 045 → 유형 아이콘 핀 + 리스트 연동 개편).
 *
 * `KakaoMap` 이 컨텍스트로 공개한 지도 핸들과 `FacilitySelectionProvider` 의 선택/필터 상태를
 * 함께 구독해 화장실·대피소 등을 **유형 아이콘 핀**으로 그린다. 산당 수십~백 개로 밀집하므로
 * **MarkerClusterer** 로 묶고(줌아웃 시 "N" 알약 배지, 줌인 시 개별 핀), 클러스터 클릭 시 한 단계
 * 확대해 펼친다.
 *
 * 리스트↔지도 연동: 리스트 행을 고르면(`source: "list"`) 해당 핀으로 pan/zoom 하고 강조 이미지+
 * InfoWindow 를 연다. 마커를 누르면 `select(id, "map")` 로 리스트가 해당 행을 스크롤·강조한다.
 *
 * 접근성(색상 단독 금지): 유형은 색 + **아이콘 모양**으로 구분하고, InfoWindow 로 시설명·유형·
 * 수용인원·고도·장애인 편의를 텍스트로 제공한다. 범례(`MapLegend`)가 유형·클러스터 의미를 병기한다.
 */

/** 줌인해 개별 핀을 보이려는 목표 레벨(클러스터 minLevel=4 미만). */
const FOCUS_LEVEL = 3;

/** 클러스터 배지 스타일 — 밋밋한 파란 점이 아니라 "이 구역 시설 N개" 알약. */
const CLUSTER_STYLE = {
  width: "34px",
  height: "34px",
  lineHeight: "34px",
  background: "#334155",
  borderRadius: "17px",
  border: "2px solid #ffffff",
  color: "#ffffff",
  textAlign: "center" as const,
  fontSize: "13px",
  fontWeight: "700",
  boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
};

export function FacilityMarkers() {
  const handle = useKakaoMapHandle();
  const selectionCtx = useFacilitySelection();

  // selectionCtx.visibleFacilities 는 프로바이더에서 이미 memo 된 참조라, 컨텍스트 객체가
  // 바뀔 때만 갱신되게 useMemo 로 감싸 effect 의존성이 매 렌더 흔들리지 않게 한다.
  const visibleFacilities = useMemo(() => selectionCtx?.visibleFacilities ?? [], [selectionCtx]);
  const selection = selectionCtx?.selection;
  const select = selectionCtx?.select;

  const markerByIdRef = useRef<Map<string, kakao.maps.Marker>>(new Map());
  const infoWindowRef = useRef<kakao.maps.InfoWindow | null>(null);
  const prevActiveRef = useRef<string | null>(null);

  // ── 마커·클러스터 구축(핸들 준비 후, 필터된 시설이 바뀔 때마다 재구성) ─────────────
  useEffect(() => {
    if (!handle || visibleFacilities.length === 0) return;
    const { kakao, map } = handle;

    // 유형별 일반/강조 마커 이미지를 1회만 만들어 재사용한다.
    const imageCache = new Map<string, kakao.maps.MarkerImage>();
    const imageFor = (type: FacilityType, active: boolean): kakao.maps.MarkerImage => {
      const key = `${type}:${active ? "a" : "n"}`;
      let img = imageCache.get(key);
      if (!img) {
        const size = active ? MARKER_SIZE_ACTIVE : MARKER_SIZE;
        img = new kakao.maps.MarkerImage(
          facilityMarkerSvg(type, active),
          new kakao.maps.Size(size.w, size.h),
          { offset: new kakao.maps.Point(size.w / 2, size.h) },
        );
        imageCache.set(key, img);
      }
      return img;
    };

    const infoWindow = new kakao.maps.InfoWindow({ removable: true, zIndex: 400 });
    infoWindowRef.current = infoWindow;

    const markerById = new Map<string, kakao.maps.Marker>();
    const markers = visibleFacilities.map((f) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(f.lat, f.lng),
        title: f.name,
        image: imageFor(f.type, false),
        clickable: true,
      });
      kakao.maps.event.addListener(marker, "click", () => {
        select?.(f.id, "map");
      });
      markerById.set(f.id, marker);
      return marker;
    });
    markerByIdRef.current = markerById;
    prevActiveRef.current = null;

    const clusterer = new kakao.maps.MarkerClusterer({
      map,
      averageCenter: true,
      minLevel: 4, // 이 레벨 이상(축소)에서 클러스터, 줌인하면 개별 마커
      disableClickZoom: true, // 직접 확대 처리(anchor 중심 한 단계)
      styles: [CLUSTER_STYLE],
      markers,
    });

    // 클러스터(숫자 배지) 클릭 → 그 중심으로 한 단계 확대해 펼친다.
    const onClusterClick = (cluster: kakao.maps.Cluster) => {
      const level = map.getLevel() - 1;
      map.setLevel(level < 1 ? 1 : level, { anchor: cluster.getCenter() });
    };
    kakao.maps.event.addListener(clusterer, "clusterclick", onClusterClick);

    return () => {
      kakao.maps.event.removeListener(clusterer, "clusterclick", onClusterClick);
      infoWindow.close();
      infoWindowRef.current = null;
      clusterer.clear();
      clusterer.setMap(null);
      for (const m of markers) m.setMap(null);
      markerByIdRef.current = new Map();
    };
    // imageFor 함수는 유형→이미지 순수 매핑이라 시설 배열에만 의존한다.
  }, [handle, visibleFacilities, select]);

  // ── 선택 반영(강조 이미지 교체 + InfoWindow + 리스트發이면 pan/zoom) ──────────────
  useEffect(() => {
    if (!handle || !selectionCtx) return;
    const { kakao, map } = handle;
    const markerById = markerByIdRef.current;
    const infoWindow = infoWindowRef.current;
    const activeId = selection?.id ?? null;

    // 이전 활성 마커를 일반 이미지로 되돌린다.
    const prev = prevActiveRef.current;
    if (prev && prev !== activeId) {
      const prevMarker = markerById.get(prev);
      const prevFacility = selectionCtx.facilities.find((f) => f.id === prev);
      if (prevMarker && prevFacility) {
        prevMarker.setImage(imageOf(kakao, prevFacility.type, false));
        prevMarker.setZIndex(1);
      }
    }

    if (!activeId) {
      infoWindow?.close();
      prevActiveRef.current = null;
      return;
    }

    const marker = markerById.get(activeId);
    const facility = selectionCtx.facilities.find((f) => f.id === activeId);
    if (!marker || !facility) {
      // 필터로 숨겨졌거나 아직 미구축 — 열린 창만 정리.
      infoWindow?.close();
      prevActiveRef.current = activeId;
      return;
    }

    marker.setImage(imageOf(kakao, facility.type, true));
    marker.setZIndex(10);
    prevActiveRef.current = activeId;

    // 리스트에서 고른 경우에만 지도를 그 지점으로 이동·확대한다(마커 클릭은 이미 보임).
    if (selection?.source === "list") {
      const pos = marker.getPosition();
      if (map.getLevel() > FOCUS_LEVEL) map.setLevel(FOCUS_LEVEL);
      map.panTo(pos);
    }

    if (infoWindow) {
      infoWindow.setContent(buildInfoContent(facility));
      infoWindow.open(map, marker);
    }
    // selection.nonce 변화로 동일 항목 재선택도 재발화된다.
  }, [handle, selectionCtx, selection, visibleFacilities]);

  return null;
}

/** 유형×활성 여부로 MarkerImage 를 만든다(선택 반영 effect 전용, 경량 재생성). */
function imageOf(
  kakaoNs: typeof kakao,
  type: FacilityType,
  active: boolean,
): kakao.maps.MarkerImage {
  const size = active ? MARKER_SIZE_ACTIVE : MARKER_SIZE;
  return new kakaoNs.maps.MarkerImage(
    facilityMarkerSvg(type, active),
    new kakaoNs.maps.Size(size.w, size.h),
    { offset: new kakaoNs.maps.Point(size.w / 2, size.h) },
  );
}

/** 마커 클릭 시 보여줄 InfoWindow 내용(DOM 엘리먼트 — textContent 로 안전하게 구성). */
function buildInfoContent(f: Facility): HTMLElement {
  const box = document.createElement("div");
  box.style.cssText = "padding:6px 10px;font-size:12px;line-height:1.4;max-width:200px";

  const name = document.createElement("div");
  name.textContent = f.name;
  name.style.cssText = "font-weight:600;white-space:normal";
  box.appendChild(name);

  const meta: string[] = [FACILITY_TYPE_LABEL[f.type]];
  if (f.type === "shelter" && f.capacity != null && f.capacity > 0) {
    meta.push(`수용 ${f.capacity}명`);
  }
  if (f.elevation != null) meta.push(`${f.elevation}m`);
  if (f.accessible) meta.push("장애인 편의");

  const sub = document.createElement("div");
  sub.textContent = meta.join(" · ");
  sub.style.cssText = "color:#6b7280;margin-top:2px";
  box.appendChild(sub);

  return box;
}
