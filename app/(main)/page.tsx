// 홈/검색 화면. 정식 검색·자동완성 UI는 Task 009에서 구현한다.
// Task 005 단계에서는 공통 레이아웃 위에 놓이는 최소 골격만 둔다.
export default function HomePage() {
  return (
    <section className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-bold">지금 이 산에 가도 될까?</h1>
      <p className="text-sm text-muted-foreground">
        산 이름 하나로 오늘 날씨·탐방로·컨디션을 3초 안에.
      </p>
      <p className="mt-6 text-xs text-muted-foreground">검색 화면 준비 중입니다.</p>
    </section>
  );
}
