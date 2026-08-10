"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { Facility, FacilityType } from "@/lib/types";

/**
 * 편의시설 리스트↔지도 연동 공유 상태 (지도·편의시설 UI 개편).
 *
 * 기존에는 지도 마커와 리스트가 **서로 다른 서버 서브트리에서 시설 데이터를 각각 페치**해
 * 클릭 연동이 불가능했다. 이 프로바이더가 시설 배열·선택(activeId)·유형 필터를 단일 출처로
 * 들고, 지도(`FacilityMarkers`)와 리스트(`FacilityList`)·필터칩이 모두 이를 구독한다.
 *
 * - `select(id, source)` — 리스트/마커 어느 쪽에서 골랐는지(`source`)와 매 클릭마다 증가하는
 *   `nonce` 를 함께 담아, 같은 항목을 다시 눌러도(재-pan/재-scroll) 효과가 재발화되게 한다.
 * - `source` 로 반대편만 반응하게 한다: 리스트에서 고르면 지도가 pan/zoom, 마커를 누르면
 *   리스트가 해당 행으로 스크롤. (누른 쪽은 이미 보이므로 되-스크롤/되-pan 하지 않음)
 * - `typeFilter` 는 지도 마커와 리스트를 **동시에** 필터한다.
 */

export interface FacilitySelection {
  id: string | null;
  source: "list" | "map";
  /** 매 select 마다 증가 — 동일 id 재선택도 effect 를 재발화시키는 키 */
  nonce: number;
}

interface FacilitySelectionValue {
  facilities: Facility[];
  /** 데이터에 실제로 존재하는 유형(표시 순서 정렬) */
  availableTypes: FacilityType[];
  typeFilter: FacilityType | null;
  setTypeFilter: (type: FacilityType | null) => void;
  /** typeFilter 적용된 시설(지도·리스트 공용) */
  visibleFacilities: Facility[];
  selection: FacilitySelection;
  activeId: string | null;
  select: (id: string | null, source: "list" | "map") => void;
}

const FacilitySelectionContext = createContext<FacilitySelectionValue | null>(null);

/** 유형 표시 순서(선언 순). */
const TYPE_ORDER: FacilityType[] = ["toilet", "shelter", "spring", "shop"];

export function FacilitySelectionProvider({
  facilities,
  children,
}: {
  facilities: Facility[];
  children: ReactNode;
}) {
  const [selection, setSelection] = useState<FacilitySelection>({
    id: null,
    source: "list",
    nonce: 0,
  });
  const [typeFilter, setTypeFilter] = useState<FacilityType | null>(null);

  const availableTypes = useMemo(() => {
    const present = new Set(facilities.map((f) => f.type));
    return TYPE_ORDER.filter((t) => present.has(t));
  }, [facilities]);

  const visibleFacilities = useMemo(
    () => (typeFilter ? facilities.filter((f) => f.type === typeFilter) : facilities),
    [facilities, typeFilter],
  );

  const select = useCallback((id: string | null, source: "list" | "map") => {
    setSelection((prev) => ({ id, source, nonce: prev.nonce + 1 }));
  }, []);

  // 유형 필터를 바꿀 때, 현재 선택이 필터에서 사라지면 선택 해제한다.
  const setTypeFilterSafe = useCallback(
    (type: FacilityType | null) => {
      setTypeFilter(type);
      setSelection((prev) => {
        if (!prev.id) return prev;
        const stillVisible = facilities.some(
          (f) => f.id === prev.id && (type === null || f.type === type),
        );
        return stillVisible ? prev : { id: null, source: prev.source, nonce: prev.nonce + 1 };
      });
    },
    [facilities],
  );

  const value = useMemo<FacilitySelectionValue>(
    () => ({
      facilities,
      availableTypes,
      typeFilter,
      setTypeFilter: setTypeFilterSafe,
      visibleFacilities,
      selection,
      activeId: selection.id,
      select,
    }),
    [
      facilities,
      availableTypes,
      typeFilter,
      setTypeFilterSafe,
      visibleFacilities,
      selection,
      select,
    ],
  );

  return (
    <FacilitySelectionContext.Provider value={value}>{children}</FacilitySelectionContext.Provider>
  );
}

/** 프로바이더 하위에서 시설 선택 상태를 구독한다. 프로바이더 밖이면 null. */
export function useFacilitySelection(): FacilitySelectionValue | null {
  return useContext(FacilitySelectionContext);
}
