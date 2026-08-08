// 산 상세 화면 (결론 우선). 날씨·탐방로 실데이터 연동은 Task 016·017·019,
// UI 컴포넌트는 Task 010에서 구현한다. 여기서는 라우트 골격만 둔다.

// Next.js 16 규약: params 는 비동기(Promise)이다.
export default async function MountainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <section className="flex flex-col gap-6 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">산 상세</p>
        <h1 className="text-xl font-bold">산 정보 (id: {id})</h1>
      </header>

      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        날씨·탐방로 요약과 컨디션 점수가 이 자리에 표시됩니다. (Task 010·019)
      </div>
    </section>
  );
}
