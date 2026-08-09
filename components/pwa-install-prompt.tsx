"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 홈 화면 설치 유도 배너 (Task 012 UI → Task 030 동작 연결).
 *
 * 동작:
 *  - `beforeinstallprompt`(Android Chrome 등)를 캡처·`preventDefault` 해 기본 미니바를 막고,
 *    우리 배너를 노출한다. iOS Safari 등 이벤트 미지원 환경에서는 배너를 띄우지 않는다.
 *  - "설치" → 저장해둔 이벤트의 `prompt()` 호출, 사용자 선택 후 배너를 닫는다.
 *  - "닫기" → `localStorage` 에 디스미스 기록(재노출 억제). 이미 설치(standalone)면 처음부터 숨김.
 *
 * `(main)` 레이아웃 하단에 고정 배치되어 앱 전역에서 노출된다.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "sangil-pwa-dismissed";

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari 홈 화면 실행 플래그
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallPrompt({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // 최초 사용자 상호작용 이후에만 배너를 노출한다. 배너 텍스트 블록이 커서(하단 고정)
  // 로딩 창에 등장하면 LCP 요소로 잡혀 LCP 가 악화되는데(Task 032), LCP 는 첫 입력 시점에
  // 확정되므로 상호작용 이후 등장하면 임계경로 밖으로 빠진다. 설치 유도를 콘텐츠 확인 뒤로
  // 미루는 것이 UX 상으로도 낫다.
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // 브라우저 기본 설치 미니바 억제
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    // 설치 완료되면 배너 정리
    const onInstalled = () => setDeferredPrompt(null);

    const markInteracted = () => setInteracted(true);
    const interactionEvents = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    for (const ev of interactionEvents) {
      window.addEventListener(ev, markInteracted, { once: true, passive: true });
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      for (const ev of interactionEvents) window.removeEventListener(ev, markInteracted);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null); // prompt 는 1회용
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage 불가 환경은 무시(세션 내 숨김만)
    }
    setDeferredPrompt(null);
  };

  // 설치 가능 이벤트를 받았고, 사용자가 한 번 상호작용한 뒤에만 노출(LCP 임계경로 회피)
  if (!deferredPrompt || !interacted) return null;

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

        <button
          type="button"
          onClick={handleInstall}
          className="inline-flex h-11 shrink-0 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          설치
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="설치 안내 닫기"
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
