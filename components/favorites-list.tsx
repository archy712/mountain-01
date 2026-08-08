"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Heart, Mountain as MountainIcon, Search, X } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SCORE_GRADE_LABEL, type ScoreGrade } from "@/lib/types";

/** 목록 카드 1건 — 서버에서 점수까지 산출해 직렬화해 넘긴다. */
export interface FavoriteItem {
  mountainId: string;
  name: string;
  region: string;
  altitude: number | null;
  /** 컨디션 점수(0~100). 계산 불가(날씨 실패 등)면 null */
  score: number | null;
  grade: ScoreGrade | null;
}

const GRADE_CHIP: Record<ScoreGrade, string> = {
  excellent: "border-grade-excellent/30 bg-grade-excellent/10 text-grade-excellent",
  good: "border-grade-good/30 bg-grade-good/10 text-grade-good",
  fair: "border-grade-fair/30 bg-grade-fair/10 text-grade-fair",
  poor: "border-grade-poor/30 bg-grade-poor/10 text-grade-poor",
  dangerous: "border-grade-dangerous/30 bg-grade-dangerous/10 text-grade-dangerous",
};

/** 색상 단독 구분 금지: 점수 + 등급 텍스트 병기 */
function ScoreChip({ score, grade }: { score: number; grade: ScoreGrade }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        GRADE_CHIP[grade],
      )}
    >
      <span className="tabular-nums">{score}</span>
      <span>{SCORE_GRADE_LABEL[grade]}</span>
    </span>
  );
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
                    {item.score !== null && item.grade !== null ? (
                      <ScoreChip score={item.score} grade={item.grade} />
                    ) : null}
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
