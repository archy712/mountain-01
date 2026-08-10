"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/client";

/**
 * 산 상세 공유 버튼 (Task 041).
 *
 * 모바일 OS 공유 시트(Web Share API)를 우선 사용하고, 미지원 브라우저에서는 링크를
 * 클립보드에 복사하고 "복사됨" 피드백을 보여준다. 백엔드 없이 동작한다(활성도 KPI 기여).
 * 공유 URL 은 현재 상세 페이지(`window.location.href`)이며, 링크 프리뷰(OG)는 상세
 * `generateMetadata` 가 산별로 제공한다. 공유 성공은 best-effort 로 계측한다.
 */
export function ShareButton({
  mountainId,
  mountainName,
  className,
}: {
  mountainId: string;
  mountainName: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setError(null);
    const url = window.location.href;
    const title = `${mountainName} 날씨·탐방로 | 산길정보`;
    const text = `${mountainName} 오늘 날씨와 탐방로 개방 여부를 확인해 보세요.`;

    // 1) Web Share API — 모바일 OS 공유 시트(카카오톡·메시지 등).
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        track("mountain_share", { mountainId, props: { method: "web_share" } });
        return;
      } catch (e) {
        // 사용자가 공유 시트를 취소하면 AbortError — 오류가 아니므로 조용히 종료.
        if (e instanceof DOMException && e.name === "AbortError") return;
        // 그 외 공유 실패는 아래 클립보드 폴백으로 진행.
      }
    }

    // 2) 폴백 — 링크 클립보드 복사 + "복사됨" 피드백.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("mountain_share", { mountainId, props: { method: "clipboard" } });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("링크를 복사하지 못했어요.");
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleShare}
        aria-label={`${mountainName} 공유하기`}
        className="flex size-11 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {copied ? (
          <Check className="size-5 text-status-open" aria-hidden="true" />
        ) : (
          <Share2 className="size-5" aria-hidden="true" />
        )}
      </button>

      {copied ? (
        <p
          role="status"
          className="absolute top-[calc(100%+0.25rem)] right-0 z-50 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-lg"
        >
          링크가 복사됐어요
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="absolute top-[calc(100%+0.25rem)] right-0 z-50 w-44 text-right text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
