"use client";

import { useEffect } from "react";

import { ErrorFallback } from "@/components/error-fallback";

// 산 상세 에러 바운더리. Task 008 공통 `ErrorFallback`(메시지 + 재시도)을 사용한다.
// 이 경계는 렌더 중 throw 된 예외를 잡는다(소스별 부분 실패는 페이지 내에서 격리 처리).
export default function MountainDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 관측을 위해 콘솔에 기록. 정식 로깅은 Task 034에서 연동한다.
    console.error(error);
  }, [error]);

  return (
    <div className="py-6">
      <ErrorFallback
        title="정보를 불러오지 못했습니다"
        message="잠시 후 다시 시도해 주세요. 문제가 계속되면 네트워크 상태를 확인해 주세요."
        onRetry={reset}
      />
    </div>
  );
}
