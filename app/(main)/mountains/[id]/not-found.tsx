import Link from "next/link";

// 존재하지 않는 산 id 접근 시 표시. Task 019에서 notFound() 연결.
export default function MountainNotFound() {
  return (
    <section className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 py-6 text-center">
      <h1 className="text-lg font-semibold">산을 찾을 수 없어요</h1>
      <p className="text-sm text-muted-foreground">
        주소가 정확한지 확인하거나 다시 검색해 주세요.
      </p>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
      >
        홈으로
      </Link>
    </section>
  );
}
