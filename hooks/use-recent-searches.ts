"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 최근 검색(선택한 산) 기록 훅 (Task 009).
 *
 * `localStorage` 에 최근 선택한 산을 저장한다. 검색 인풋(추가)과 최근 검색 칩
 * (표시·삭제)이 서로 다른 컴포넌트라 동일 탭 내 동기화를 위해 커스텀 이벤트를
 * 브로드캐스트한다(`storage` 이벤트는 동일 탭에서 발화하지 않으므로 별도 처리).
 * `useSyncExternalStore` 로 SSR/하이드레이션 불일치 없이 외부 스토어를 구독한다.
 *
 * 저장은 익명 클라이언트 기록일 뿐이며, 서버 `search_logs`(결정 002 #14)와는 무관하다.
 */

const STORAGE_KEY = "sangil:recent-searches";
const SYNC_EVENT = "sangil:recent-searches-changed";
const MAX_ITEMS = 8;

export interface RecentSearch {
  id: string;
  name: string;
  region: string;
}

// 서버·초기 스냅샷용 안정 참조(빈 배열)
const EMPTY: RecentSearch[] = [];
// getSnapshot 이 매 호출마다 새 배열을 반환하면 무한 렌더가 되므로,
// 원본 문자열이 바뀔 때만 파싱해 참조를 캐시한다.
let cacheRaw: string | null = null;
let cacheValue: RecentSearch[] = EMPTY;

function parse(raw: string): RecentSearch[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter(
      (item): item is RecentSearch =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecentSearch).id === "string" &&
        typeof (item as RecentSearch).name === "string" &&
        typeof (item as RecentSearch).region === "string",
    );
  } catch {
    return EMPTY;
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(SYNC_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SYNC_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): RecentSearch[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  cacheValue = raw ? parse(raw) : EMPTY;
  return cacheValue;
}

function getServerSnapshot(): RecentSearch[] {
  return EMPTY;
}

function write(items: RecentSearch[]) {
  try {
    const serialized = JSON.stringify(items);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    // 캐시를 즉시 갱신해 구독 콜백 재조회 시 안정 참조를 반환
    cacheRaw = serialized;
    cacheValue = items;
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    // 저장 실패(용량 초과·프라이빗 모드 등)는 무시 — 기능 저하만
  }
}

export function useRecentSearches() {
  const recent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((item: RecentSearch) => {
    const current = getSnapshot();
    write([item, ...current.filter((r) => r.id !== item.id)].slice(0, MAX_ITEMS));
  }, []);

  const remove = useCallback((id: string) => {
    write(getSnapshot().filter((r) => r.id !== id));
  }, []);

  const clear = useCallback(() => {
    write(EMPTY);
  }, []);

  return { recent, add, remove, clear };
}
