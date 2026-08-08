import { Suspense } from "react";
import Link from "next/link";

import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

/**
 * 공통 상단 헤더 (모바일 우선).
 * 로고(홈 링크) + 즐겨찾기/인증 컨트롤 + 테마 스위처. `(main)` 레이아웃에서 sticky 로 배치.
 *
 * 인증 상태(`AuthButton`)는 요청별 세션에 의존하므로 `<Suspense>` 로 감싼다
 * (`cacheComponents: true` 규약). 로그인 유도·즐겨찾기 진입은 Task 025.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-screen-sm items-center justify-between gap-2 px-5">
        <Link
          href="/"
          className="inline-flex h-11 items-center text-base font-semibold tracking-tight"
        >
          산길날씨
        </Link>
        <div className="flex items-center gap-1">
          <Suspense fallback={<div className="h-8 w-28" aria-hidden="true" />}>
            <AuthButton />
          </Suspense>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
