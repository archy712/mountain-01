// 즐겨찾기 화면. 2단계(Task 025·026)에서 인증 + favorites CRUD 로 활성화한다.
// 이 라우트는 proxy.ts 보호 경로라 비로그인 시 /auth/login 으로 리다이렉트된다.
export default function FavoritesPage() {
  return (
    <section className="flex flex-col gap-6 py-6">
      <h1 className="text-xl font-bold">즐겨찾기</h1>
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        저장한 산 목록이 이 자리에 표시됩니다. (Task 026, 2단계)
      </div>
    </section>
  );
}
