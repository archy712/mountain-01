import Link from "next/link";

import { ThemeSwitcher } from "@/components/theme-switcher";

/**
 * 공통 상단 헤더 (모바일 우선).
 * 로고(홈 링크) + 테마 스위처. `(main)` 레이아웃에서 sticky 로 배치한다.
 * 검색/네비게이션 확장은 Task 009(홈/검색)·025(인증·즐겨찾기)에서 진행한다.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-screen-sm items-center justify-between px-5">
        <Link
          href="/"
          className="inline-flex h-11 items-center text-base font-semibold tracking-tight"
        >
          산길날씨
        </Link>
        <ThemeSwitcher />
      </div>
    </header>
  );
}
