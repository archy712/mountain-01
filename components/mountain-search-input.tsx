"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import { MapPin, Search, X } from "lucide-react";

import { Command, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import type { ApiResponse, MountainSuggestion } from "@/lib/types";

/**
 * 산 이름 자동완성 검색 인풋 (Task 009 UI → Task 018 실데이터 연동).
 *
 * - 입력 시 `/api/mountains/search` 로 서버 검색(부분일치 + 초성 + 지역)을 조회해
 *   지역명 병기 후보로 제안한다(결정 002 #2, 동명 산 구분).
 * - 선택 즉시 `/mountains/[id]` 상세로 직결하고, 최근 검색(localStorage) 기록 +
 *   `search_logs` 익명 로깅(fire-and-forget)을 남긴다.
 * - `cmdk` 로 키보드 내비게이션(↑/↓/Enter/Esc)과 combobox ARIA 를 확보한다.
 * - 인풋·후보 모두 44px 이상 터치 타깃을 보장한다.
 *
 * 디바운스(180ms) + 직전 요청 취소(AbortController)로 입력 후 300ms 내 후보 노출을 노린다.
 */

const DEBOUNCE_MS = 180;

export function MountainSearchInput({ className }: { className?: string }) {
  const router = useRouter();
  const { add } = useRecentSearches();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<MountainSuggestion[]>([]);
  const [fetching, setFetching] = useState(false);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 입력 디바운스: 빈 입력은 즉시 반영해 드롭다운이 곧바로 닫히도록 한다.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), query.trim() === "" ? 0 : DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // 디바운스된 질의로 서버 검색. 직전 요청은 취소해 순서 역전(stale 응답)을 막는다.
  // setState 는 중첩 async 함수 안에서만 호출한다(effect 본문 동기 setState 회피).
  useEffect(() => {
    const q = debounced.trim();
    if (q === "") return;

    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      setFetching(true);
      try {
        const res = await fetch(`/api/mountains/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const body = (await res.json()) as ApiResponse<MountainSuggestion[]>;
        if (cancelled) return;
        setResults(body.status === "ok" ? body.data : []);
      } catch {
        // 취소는 무시. 그 외 실패는 결과 없음으로 처리(앱 크래시 없음).
        if (!cancelled && !controller.signal.aborted) setResults([]);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debounced]);

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  const hasQuery = query.trim() !== "";
  // 디바운스가 아직 안 따라잡았거나 요청 진행 중이면 로딩.
  const loading = hasQuery && (debounced !== query || fetching);
  const open = focused && hasQuery;
  const showEmpty = open && !loading && debounced.trim() !== "" && results.length === 0;

  function logSelection(mountain: MountainSuggestion) {
    // 익명 검색 로깅(결정 002 #14). 최선노력이라 실패는 무시하고 흐름을 막지 않는다.
    try {
      void fetch("/api/search-logs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: query.trim(), mountainId: mountain.id }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // 무시
    }
  }

  function handleSelect(mountain: MountainSuggestion) {
    logSelection(mountain);
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
        data-focus-ring="container"
        className={cn(
          "flex min-h-12 items-center gap-2 rounded-xl border bg-card px-3.5 shadow-sm transition-colors",
          "focus-within:border-ring",
        )}
      >
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <CommandPrimitive.Input
          data-focus-ring="managed"
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
