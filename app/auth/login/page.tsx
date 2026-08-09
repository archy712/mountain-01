import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { LoadingBar } from "@/components/loading-bar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 내부 경로만 허용해 오픈 리다이렉트를 막는다. 외부/프로토콜 상대 URL 은 기본값으로.
 */
function safeNext(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/mypage";
}

/**
 * searchParams(요청 데이터) 접근부를 async 컴포넌트로 분리해 `<Suspense>` 로 감싼다
 * (`cacheComponents: true` 규약). `next` 는 proxy 의 로그인 리다이렉트가 실어 준 복귀 경로.
 */
async function LoginPanel({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={safeNext(next)} />;
}

/**
 * 로그인 폼 로딩 스켈레톤.
 *
 * 예전 `h-64` 회색 빈 박스(구조·라벨·a11y 없음 → "멈춤"처럼 보임) 대신, 실제 로그인 카드
 * 골격(제목·입력 2개·버튼·소셜 버튼)을 흉내 내 CLS 를 줄이고, `role="status"`+sr-only 로
 * 스크린리더에도 로딩을 알린다. 상단 `LoadingBar` 로 진행감을 준다.
 */
function LoginFormSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex flex-col gap-6 rounded-lg border bg-card p-6 shadow-sm"
    >
      <span className="sr-only">로그인 화면을 불러오는 중입니다…</span>
      <LoadingBar />
      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
      <Skeleton aria-hidden="true" className="h-11 w-full rounded-md" />
      <Skeleton aria-hidden="true" className="h-11 w-full rounded-md" />
    </div>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginPanel searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
