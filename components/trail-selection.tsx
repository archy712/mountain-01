"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * 탐방로 선택 상태 공유 컨텍스트 (Task 032).
 *
 * 상세 화면에서 탐방로 목록(`TrailListInteractive`, 서버 스트리밍된 데이터를 받는 클라이언트)과
 * 지도 폴리라인 오버레이(`TrailOverlay`)는 서로 다른 <Suspense> 경계에 있어 상태를 직접
 * 주고받을 수 없다. 두 섹션을 이 Provider 로 감싸 "목록 클릭 ↔ 지도 강조"를 양방향으로 잇는다.
 *
 * - `selectedId`  : 현재 선택된 탐방로 id (없으면 null)
 * - `select(id)`  : 선택 토글(같은 id 재클릭 시 해제, null 전달 시 항상 해제)
 * - `availableIds`: 지도에 실제 폴리라인이 그려진 탐방로 id 집합. 오버레이가 마운트 시 등록한다.
 *   목록은 이 집합에 든 항목만 클릭 가능(지도에 대응 선이 없는 탐방로의 죽은 클릭 방지)하게 한다.
 */

interface TrailSelectionValue {
  selectedId: string | null;
  select: (id: string | null) => void;
  availableIds: ReadonlySet<string>;
  registerIds: (ids: string[]) => void;
}

const noop = () => {};

// Provider 없이 쓰여도(예: 단독 렌더) 크래시하지 않도록 안전한 기본값을 둔다.
const TrailSelectionContext = createContext<TrailSelectionValue>({
  selectedId: null,
  select: noop,
  availableIds: new Set(),
  registerIds: noop,
});

export function useTrailSelection(): TrailSelectionValue {
  return useContext(TrailSelectionContext);
}

export function TrailSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [availableIds, setAvailableIds] = useState<ReadonlySet<string>>(() => new Set());

  const select = useCallback((id: string | null) => {
    // 같은 항목 재클릭은 해제. null 은 항상 해제.
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const registerIds = useCallback((ids: string[]) => {
    setAvailableIds((prev) => {
      // 동일 집합이면 참조를 유지해 불필요한 리렌더/루프를 막는다.
      if (prev.size === ids.length && ids.every((id) => prev.has(id))) return prev;
      return new Set(ids);
    });
  }, []);

  const value = useMemo(
    () => ({ selectedId, select, availableIds, registerIds }),
    [selectedId, select, availableIds, registerIds],
  );

  return <TrailSelectionContext.Provider value={value}>{children}</TrailSelectionContext.Provider>;
}
