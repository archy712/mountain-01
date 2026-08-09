"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/lib/types";

/**
 * 사용자 친화 에러 폴백.
 *
 * 표준 `ApiError.message`(한국어)를 그대로 노출하고 재시도 버튼을 함께 렌더한다.
 * 재시도는 두 방식 중 하나:
 * - `onRetry`(클라이언트 경계, 예: 라우트 `error.tsx` 의 `reset`) 콜백 실행.
 * - `refreshOnRetry`: 서버 컴포넌트에서 렌더되는 소스별 부분 실패(날씨/탐방로만 실패)용.
 *   콜백을 서버→클라이언트로 넘길 수 없으므로, 이 컴포넌트가 직접 `router.refresh()` 로
 *   서버 컴포넌트를 재실행(=해당 소스 재조회)한다(Task 033: 모든 에러 경로에 재시도 버튼).
 */

const DEFAULT_TITLE = "정보를 불러오지 못했어요";
const DEFAULT_MESSAGE = "잠시 후 다시 시도해 주세요.";

export interface ErrorFallbackProps {
  /** 표준 에러(있으면 message 를 본문으로 사용) */
  error?: ApiError;
  /** error 가 없을 때 사용할 본문 문구 */
  message?: string;
  title?: string;
  /** 있으면 재시도 버튼이 이 콜백을 실행 */
  onRetry?: () => void;
  /** true 면 재시도 버튼이 `router.refresh()` 로 서버 컴포넌트를 재실행(서버 컴포넌트 폴백용) */
  refreshOnRetry?: boolean;
  className?: string;
}

export function ErrorFallback({
  error,
  message,
  title = DEFAULT_TITLE,
  onRetry,
  refreshOnRetry,
  className,
}: ErrorFallbackProps) {
  const router = useRouter();
  const description = error?.message ?? message ?? DEFAULT_MESSAGE;
  const handleRetry = onRetry ?? (refreshOnRetry ? () => router.refresh() : undefined);

  return (
    <Alert variant="destructive" className={cn("flex flex-col gap-3", className)}>
      <TriangleAlert aria-hidden="true" />
      <div>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </div>
      {handleRetry ? (
        <Button variant="outline" onClick={handleRetry} className="h-11 w-fit gap-1.5">
          <RefreshCw className="size-4" aria-hidden="true" />
          다시 시도
        </Button>
      ) : null}
    </Alert>
  );
}
