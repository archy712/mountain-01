"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 홈 화면 설치 유도 배너 UI (Task 012, 3단계 PWA 준비).
 *
 * 현재는 **배너 UI 골격만** 담당한다. 실제 설치 트리거(`beforeinstallprompt` 캡처,
 * 설치/디스미스 상태의 세션 저장, 이미 설치된 경우 숨김)는 Phase 5(Task 030)에서
 * 연결한다. 지금은 마운트 시 노출되고 닫기 버튼으로 감출 수 있는 상태만 갖는다.
 *
 * `(main)` 레이아웃 하단에 고정 배치되어 앱 전역에서 노출된다.
 */
export function PwaInstallPrompt({ className }: { className?: string }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="앱 설치 안내"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-screen-sm items-center gap-3 rounded-xl border bg-card p-3 shadow-lg">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Download className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">산길날씨를 홈 화면에 추가하세요</p>
          <p className="truncate text-xs text-muted-foreground">
            앱처럼 빠르게 열고 오프라인에서도 마지막 정보를 볼 수 있어요.
          </p>
        </div>

        {/* Task 030에서 beforeinstallprompt.prompt() 연결 */}
        <button
          type="button"
          className="inline-flex h-11 shrink-0 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          설치
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="설치 안내 닫기"
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
