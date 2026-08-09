import { Suspense } from "react";
import Link from "next/link";
import { Mountain } from "lucide-react";

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
          className="inline-flex h-11 items-center gap-1.5 text-base font-semibold tracking-tight"
        >
          <Mountain className="size-5 text-primary" aria-hidden="true" />
          산길정보
        </Link>
        <div className="flex items-center gap-1">
          {/* 폴백 크기를 실제 컨트롤(즐겨찾기 + 로그인/로그아웃, 44px 행)에 맞춰 예약해
              세션 확정 시 헤더가 밀리지 않게 한다(CLS, Task 032). */}
          <Suspense fallback={<div className="h-11 w-[104px]" aria-hidden="true" />}>
            <AuthButton />
          </Suspense>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
