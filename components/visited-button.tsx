"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/client";

/**
 * 방문완료 토글 버튼 (Task 037). 즐겨찾기(`favorite-button.tsx`)와 동일한 패턴이다.
 *
 * - 비로그인: 클릭 시 로그인 유도 팝오버(결정 002 #12).
 * - 로그인: `/api/visited` 로 추가/삭제. **낙관적 업데이트** 후 실패 시 롤백한다.
 *   RLS 로 서버에서 본인 데이터만 조작되므로 user_id 는 전송하지 않는다.
 * 목록 반영이 필요한 화면(상세→목록 복귀)을 위해 성공 시 `router.refresh()` 한다.
 */
export function VisitedButton({
  mountainId,
  initialVisited = false,
  isAuthenticated = false,
  className,
}: {
  /** 대상 산 id (mountains.id) */
  mountainId: string;
  /** 방문완료 초기 상태(기록됨) */
  initialVisited?: boolean;
  /** 로그인 여부(미로그인 시 로그인 유도) */
  isAuthenticated?: boolean;
  className?: string;
}) {
  const [visited, setVisited] = useState(initialVisited);
  const [showPrompt, setShowPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function toggle() {
    const next = !visited;
    setVisited(next); // 낙관적 업데이트
    setError(null);

    try {
      const res = next
        ? await fetch("/api/visited", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mountainId }),
          })
        : await fetch(`/api/visited?mountainId=${encodeURIComponent(mountainId)}`, {
            method: "DELETE",
          });
      if (!res.ok) throw new Error(String(res.status));
      // 방문완료 등록/해제 계측(Task 035 화이트리스트).
      track(next ? "visited_add" : "visited_remove", { mountainId });
      // 서버 렌더 목록(/visited 등)에 반영.
      startTransition(() => router.refresh());
    } catch {
      setVisited(!next); // 롤백
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
        aria-pressed={visited}
        aria-label={visited ? "방문완료 해제" : "방문완료 기록"}
        className={cn(
          "flex size-11 items-center justify-center rounded-full border transition-colors disabled:opacity-60",
          visited
            ? "border-status-open/30 bg-status-open/10 text-status-open"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <CircleCheck className="size-5" aria-hidden="true" />
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
          <p className="text-popover-foreground">로그인하면 방문한 산을 기록할 수 있어요.</p>
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
