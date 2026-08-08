"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 즐겨찾기 버튼 UI (Task 011, 2단계 범위).
 *
 * 1단계는 전면 비로그인이며 즐겨찾기는 2단계부터 로그인 필요(결정 002 #12).
 * 비로그인 상태에서 누르면 로그인 유도 문구를 노출한다. 실제 저장 연동은 Task 025·026.
 * 지금은 UI 상태(활성/비활성·로그인 유도)만 담당한다.
 */
export function FavoriteButton({
  initialFavorite = false,
  isAuthenticated = false,
  className,
}: {
  /** 활성 초기 상태(저장됨) */
  initialFavorite?: boolean;
  /** 로그인 여부(미로그인 시 로그인 유도) */
  isAuthenticated?: boolean;
  className?: string;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [showPrompt, setShowPrompt] = useState(false);

  function handleClick() {
    if (!isAuthenticated) {
      setShowPrompt((v) => !v);
      return;
    }
    setFavorite((v) => !v);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={favorite}
        aria-label={favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        className={cn(
          "flex size-11 items-center justify-center rounded-full border transition-colors",
          favorite
            ? "border-status-closed/30 bg-status-closed/10 text-status-closed"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Heart className={cn("size-5", favorite && "fill-current")} aria-hidden="true" />
      </button>

      {showPrompt ? (
        <div
          role="status"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-56 rounded-lg border bg-popover p-3 text-sm shadow-lg"
        >
          <p className="text-popover-foreground">로그인하면 즐겨찾기에 저장할 수 있어요.</p>
          <Link
            href="/auth/login"
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
          >
            로그인하기
          </Link>
        </div>
      ) : null}
    </div>
  );
}
