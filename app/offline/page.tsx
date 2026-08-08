import Link from "next/link";

// 오프라인 폴백 화면. PWA 서비스워커·마지막 조회 캐시 표시는 Phase 5(Task 030)에서 구현한다.
// `(main)` 레이아웃을 상속하지 않는 독립 화면이다.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-lg font-semibold">오프라인 상태예요</h1>
      <p className="text-sm text-muted-foreground">
        인터넷 연결을 확인해 주세요. 연결되면 마지막으로 본 정보를 다시 불러옵니다.
      </p>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
      >
        홈으로
      </Link>
    </main>
  );
}
