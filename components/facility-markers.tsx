"use client";

import { useEffect } from "react";

import { useKakaoMapHandle } from "@/components/kakao-map";
import { facilityMarkerSvg } from "@/lib/facilities/marker-style";
import { FACILITY_TYPE_LABEL, type Facility, type FacilityType } from "@/lib/types";

/**
 * 편의시설 지도 마커 오버레이 (Task 045).
 *
 * `KakaoMap` 이 컨텍스트로 공개한 지도 핸들을 구독해, 화장실·대피소 등 편의시설을 유형별
 * 아이콘 마커로 그린다. 산당 최대 60~95개로 밀집하므로 **MarkerClusterer** 로 묶어(줌아웃 시
 * 개수 배지, 줌인 시 개별 마커) 지도가 붐비지 않게 한다. 카카오맵은 명령형 API 라 마커·클러스터를
 * `useEffect` 에서 만들고 언마운트/변경 시 정리한다(지도 준비 전에는 아무것도 안 함).
 *
 * 접근성(색상 단독 금지): 유형은 색 + **모양**(원/사각)으로 구분하고, 마커 클릭 시 InfoWindow 로
 * **시설명·유형·수용인원·고도·장애인 편의**를 텍스트로 제공한다. 범례(`MapLegend`)가 유형을 병기한다.
 */
export function FacilityMarkers({ facilities }: { facilities: Facility[] }) {
  const handle = useKakaoMapHandle();

  useEffect(() => {
    if (!handle || facilities.length === 0) return;
    const { kakao, map } = handle;

    // 유형별 마커 이미지를 1회만 만들어 재사용한다.
    const imageCache = new Map<FacilityType, kakao.maps.MarkerImage>();
    const imageFor = (type: FacilityType): kakao.maps.MarkerImage => {
      let img = imageCache.get(type);
      if (!img) {
        img = new kakao.maps.MarkerImage(facilityMarkerSvg(type), new kakao.maps.Size(18, 18), {
          offset: new kakao.maps.Point(9, 9),
        });
        imageCache.set(type, img);
      }
      return img;
    };

    // 하나의 InfoWindow 를 공유해, 마커를 새로 클릭하면 이전 창이 대체되도록 한다.
    const infoWindow = new kakao.maps.InfoWindow({ removable: true, zIndex: 300 });

    const markers = facilities.map((f) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(f.lat, f.lng),
        title: f.name,
        image: imageFor(f.type),
        clickable: true,
      });
      kakao.maps.event.addListener(marker, "click", () => {
        infoWindow.setContent(buildInfoContent(f));
        infoWindow.open(map, marker);
      });
      return marker;
    });

    const clusterer = new kakao.maps.MarkerClusterer({
      map,
      averageCenter: true,
      minLevel: 4, // 이 레벨 이상(축소)에서 클러스터, 줌인하면 개별 마커
      markers,
    });

    return () => {
      infoWindow.close();
      clusterer.clear();
      clusterer.setMap(null);
      for (const m of markers) m.setMap(null);
    };
  }, [handle, facilities]);

  return null;
}

/** 마커 클릭 시 보여줄 InfoWindow 내용(DOM 엘리먼트 — textContent 로 안전하게 구성). */
function buildInfoContent(f: Facility): HTMLElement {
  const box = document.createElement("div");
  box.style.cssText = "padding:6px 10px;font-size:12px;line-height:1.4;max-width:180px";

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
