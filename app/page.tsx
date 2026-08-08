import { ThemeSwitcher } from "@/components/theme-switcher";

// 홈/검색 화면의 정식 구현은 Task 005(라우트 골격)·009(홈/검색 UI)에서 진행한다.
// Task 004 단계에서는 스타터 잔존물을 제거한 최소 브랜드 플레이스홀더만 둔다.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col px-5">
      <header className="flex h-14 items-center justify-between">
        <span className="text-base font-semibold">산길날씨</span>
        <ThemeSwitcher />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-2xl font-bold">지금 이 산에 가도 될까?</h1>
        <p className="text-sm text-muted-foreground">
          산 이름 하나로 오늘 날씨·탐방로·컨디션을 3초 안에.
        </p>
        <p className="mt-6 text-xs text-muted-foreground">검색 화면 준비 중입니다.</p>
      </section>
    </main>
  );
}
