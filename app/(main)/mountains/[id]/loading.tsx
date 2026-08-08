// 산 상세 로딩 스켈레톤 골격. 정식 스켈레톤 컴포넌트는 Task 008(result-skeleton)에서 교체.
export default function MountainDetailLoading() {
  return (
    <section className="flex animate-pulse flex-col gap-6 py-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">불러오는 중…</span>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="h-6 w-40 rounded bg-muted" />
      </div>
      <div className="h-32 w-full rounded-lg bg-muted" />
      <div className="h-24 w-full rounded-lg bg-muted" />
    </section>
  );
}
