"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Heart, Mountain as MountainIcon, Search, X } from "lucide-react";

import { Card } from "@/components/ui/card";

/** 목록 카드 1건. 산 메타는 즉시 렌더하고, 점수 칩은 서버가 카드별로 스트리밍한 노드다. */
export interface FavoriteItem {
  mountainId: string;
  name: string;
  region: string;
  altitude: number | null;
  /** 컨디션 점수 칩(서버 `<Suspense>` 스트리밍 노드). 계산 불가면 빈 노드로 채워진다. */
  scoreSlot: ReactNode;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center">
      <Heart className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">아직 저장한 산이 없어요</p>
        <p className="text-sm text-muted-foreground">
          산 상세 화면의 하트를 눌러 자주 가는 산을 저장해 보세요.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
      >
        <Search className="size-4" aria-hidden="true" />산 검색하기
      </Link>
    </div>
  );
}

/**
 * 즐겨찾기 목록 (Task 026 클라이언트). 서버가 넘긴 초기 목록을 상태로 들고, 인라인 삭제 시
 * **낙관적으로 카드를 제거**한 뒤 `/api/favorites` DELETE 를 호출한다. 실패하면 원위치로
 * 롤백한다(순서 보존). 모두 삭제되면 빈 상태를 노출한다.
 */
export function FavoritesList({ initial }: { initial: FavoriteItem[] }) {
  const [items, setItems] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(mountainId: string) {
    const index = items.findIndex((i) => i.mountainId === mountainId);
    if (index < 0) return;
    const removed = items[index];

    setPendingId(mountainId);
    setError(null);
    setItems((prev) => prev.filter((i) => i.mountainId !== mountainId)); // 낙관적 제거

    try {
      const res = await fetch(`/api/favorites?mountainId=${encodeURIComponent(mountainId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      // 롤백: 원래 위치로 되돌린다.
      setItems((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      });
      setError("즐겨찾기를 해제하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.mountainId}>
            <Card className="flex items-center gap-2 p-2 shadow-sm">
              <Link
                href={`/mountains/${item.mountainId}`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
              >
                <MountainIcon
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold tracking-tight">{item.name}</span>
                    {item.scoreSlot}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.region}
                    {item.altitude !== null ? ` · ${item.altitude.toLocaleString()}m` : ""}
                  </p>
                </div>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
              <button
                type="button"
                onClick={() => remove(item.mountainId)}
                disabled={pendingId === item.mountainId}
                aria-label={`${item.name} 즐겨찾기 해제`}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
