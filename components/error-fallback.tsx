"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/lib/types";

/**
 * 사용자 친화 에러 폴백.
 *
 * 표준 `ApiError.message`(한국어)를 그대로 노출하고, `onRetry` 가 있으면
 * 재시도 버튼을 함께 렌더한다. 소스별 부분 실패(날씨만 실패 등) 자리에도 재사용한다.
 */

const DEFAULT_TITLE = "정보를 불러오지 못했어요";
const DEFAULT_MESSAGE = "잠시 후 다시 시도해 주세요.";

export interface ErrorFallbackProps {
  /** 표준 에러(있으면 message 를 본문으로 사용) */
  error?: ApiError;
  /** error 가 없을 때 사용할 본문 문구 */
  message?: string;
  title?: string;
  /** 있으면 재시도 버튼 노출 */
  onRetry?: () => void;
  className?: string;
}

export function ErrorFallback({
  error,
  message,
  title = DEFAULT_TITLE,
  onRetry,
  className,
}: ErrorFallbackProps) {
  const description = error?.message ?? message ?? DEFAULT_MESSAGE;

  return (
    <Alert variant="destructive" className={cn("flex flex-col gap-3", className)}>
      <TriangleAlert aria-hidden="true" />
      <div>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="w-fit gap-1.5">
          <RefreshCw className="size-4" aria-hidden="true" />
          다시 시도
        </Button>
      ) : null}
    </Alert>
  );
}
