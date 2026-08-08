"use client";

import { useEffect } from "react";

// 산 상세 에러 폴백 골격. 사용자 친화 메시지 + 재시도.
// 정식 error-fallback 컴포넌트는 Task 008에서 통합한다.
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
    <section
      className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 py-6 text-center"
      role="alert"
    >
      <h1 className="text-lg font-semibold">정보를 불러오지 못했습니다</h1>
      <p className="text-sm text-muted-foreground">
        잠시 후 다시 시도해 주세요. 문제가 계속되면 네트워크 상태를 확인해 주세요.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
      >
        다시 시도
      </button>
    </section>
  );
}
