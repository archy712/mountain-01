// 전체화면 지도 화면. 카카오맵 SDK·등산로 오버레이는 Phase 5(Task 028·029)에서 구현한다.
// 여기서는 라우트 골격만 둔다. (풀스크린 레이아웃 최적화도 Task 028에서 진행)

// Next.js 16 규약: params 는 비동기(Promise)이다.
export default async function MountainMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-xl font-bold">지도 (id: {id})</h1>
      <div className="flex min-h-[50dvh] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        카카오맵과 등산로 폴리라인이 이 자리에 표시됩니다. (Task 028·029)
      </div>
    </section>
  );
}
