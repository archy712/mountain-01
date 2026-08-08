"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import { MapPin, Search, X } from "lucide-react";

import { Command, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { searchMountains } from "@/lib/mock";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import type { Mountain } from "@/lib/types";

/**
 * 산 이름 자동완성 검색 인풋 (Task 009).
 *
 * - 입력 시 더미 후보(`searchMountains`)를 지역명 병기로 제안한다(결정 002 #2, 동명 산 구분).
 * - 선택 즉시 `/mountains/[id]` 상세로 직결하고 최근 검색에 기록한다(목록 페이지 생략).
 * - `cmdk` 로 키보드 내비게이션(↑/↓/Enter/Esc)과 combobox ARIA 를 확보한다.
 * - 인풋·후보 모두 44px 이상 터치 타깃을 보장한다.
 *
 * 더미 데이터는 동기이지만, Task 018 서버 연동 시의 비동기 로딩 UX 를 위해
 * 짧은 디바운스 로딩(스켈레톤)을 함께 노출한다.
 */

const DEBOUNCE_MS = 180;

export function MountainSearchInput({ className }: { className?: string }) {
  const router = useRouter();
  const { add } = useRecentSearches();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 입력 디바운스: 모든 상태 갱신을 타이머 콜백에서 수행(동기 setState 회피).
  // 빈 입력은 즉시 반영해 드롭다운이 곧바로 닫히도록 한다.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), query.trim() === "" ? 0 : DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => searchMountains(debounced), [debounced]);

  const hasQuery = query.trim() !== "";
  // 로딩은 파생 값: 입력이 있으나 디바운스가 아직 따라잡지 못한 상태
  const loading = hasQuery && debounced !== query;
  const open = focused && hasQuery;
  const showEmpty = open && !loading && debounced.trim() !== "" && results.length === 0;

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  function handleSelect(mountain: Mountain) {
    add({ id: mountain.id, name: mountain.name, region: mountain.region });
    setFocused(false);
    router.push(`/mountains/${mountain.id}`);
  }

  return (
    <Command
      shouldFilter={false}
      loop
      className={cn("relative overflow-visible bg-transparent", className)}
    >
      <div
        className={cn(
          "flex min-h-12 items-center gap-2 rounded-xl border bg-card px-3.5 shadow-sm transition-colors",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
        )}
      >
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <CommandPrimitive.Input
          value={query}
          onValueChange={setQuery}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            setFocused(true);
          }}
          onBlur={() => {
            // 후보 클릭이 blur 보다 먼저 처리되도록 약간 지연
            blurTimer.current = setTimeout(() => setFocused(false), 120);
          }}
          placeholder="산 이름을 검색하세요 (예: 북한산)"
          aria-label="산 이름 검색"
          className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {hasQuery ? (
          <button
            type="button"
            aria-label="검색어 지우기"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setQuery("")}
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute top-[calc(100%+0.5rem)] z-50 w-full overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
          <CommandList className="max-h-[min(60dvh,20rem)]">
            {loading ? (
              <ul className="space-y-1 p-2" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 px-2 py-2.5">
                    <Skeleton className="size-5 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : showEmpty ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                &lsquo;{query.trim()}&rsquo; 검색 결과가 없어요.
              </p>
            ) : (
              <div className="p-2">
                {results.map((mountain) => (
                  <CommandItem
                    key={mountain.id}
                    value={mountain.id}
                    onSelect={() => handleSelect(mountain)}
                    className="min-h-11 gap-3 px-2 py-2.5"
                  >
                    <MapPin className="size-5 text-muted-foreground" aria-hidden="true" />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{mountain.name}</span>
                      <span className="text-xs text-muted-foreground">{mountain.region}</span>
                    </span>
                  </CommandItem>
                ))}
              </div>
            )}
          </CommandList>
        </div>
      ) : null}
    </Command>
  );
}
