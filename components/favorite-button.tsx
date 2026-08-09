"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/client";

/**
 * 즐겨찾기 버튼 (Task 011 UI · Task 026 실연동).
 *
 * - 비로그인: 클릭 시 로그인 유도 팝오버(결정 002 #12).
 * - 로그인: `/api/favorites` 로 추가/삭제. **낙관적 업데이트** 후 실패 시 롤백한다.
 *   RLS 로 서버에서 본인 데이터만 조작되므로 user_id 는 전송하지 않는다.
 * 목록 반영이 필요한 화면(예: 상세→목록 복귀)을 위해 성공 시 `router.refresh()` 한다.
 */
export function FavoriteButton({
  mountainId,
  initialFavorite = false,
  isAuthenticated = false,
  className,
}: {
  /** 대상 산 id (mountains.id) */
  mountainId: string;
  /** 활성 초기 상태(저장됨) */
  initialFavorite?: boolean;
  /** 로그인 여부(미로그인 시 로그인 유도) */
  isAuthenticated?: boolean;
  className?: string;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [showPrompt, setShowPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function toggle() {
    const next = !favorite;
    setFavorite(next); // 낙관적 업데이트
    setError(null);

    try {
      const res = next
        ? await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mountainId }),
          })
        : await fetch(`/api/favorites?mountainId=${encodeURIComponent(mountainId)}`, {
            method: "DELETE",
          });
      if (!res.ok) throw new Error(String(res.status));
      // 즐겨찾기 등록/해제 계측(즐겨찾기 비율, Task 035).
      track(next ? "favorite_add" : "favorite_remove", { mountainId });
      // 서버 렌더 목록(/favorites 등)에 반영.
      startTransition(() => router.refresh());
    } catch {
      setFavorite(!next); // 롤백
      setError("잠시 후 다시 시도해 주세요.");
    }
  }

  function handleClick() {
    if (!isAuthenticated) {
      setShowPrompt((v) => !v);
      return;
    }
    void toggle();
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={favorite}
        aria-label={favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        className={cn(
          "flex size-11 items-center justify-center rounded-full border transition-colors disabled:opacity-60",
          favorite
            ? "border-status-closed/30 bg-status-closed/10 text-status-closed"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Heart className={cn("size-5", favorite && "fill-current")} aria-hidden="true" />
      </button>

      {error ? (
        <p
          role="alert"
          className="absolute top-[calc(100%+0.25rem)] right-0 z-50 w-44 text-right text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}

      {showPrompt ? (
        <div
          role="status"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-56 rounded-lg border bg-popover p-3 text-sm shadow-lg"
        >
          <p className="text-popover-foreground">로그인하면 즐겨찾기에 저장할 수 있어요.</p>
          <Link
            href="/auth/login"
            className="mt-2 inline-flex h-11 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
          >
            로그인하기
          </Link>
        </div>
      ) : null}
    </div>
  );
}
