import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

/**
 * 내부 경로만 허용해 오픈 리다이렉트를 막는다. 외부/프로토콜 상대 URL 은 기본값으로.
 */
function safeNext(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/favorites";
}

/**
 * searchParams(요청 데이터) 접근부를 async 컴포넌트로 분리해 `<Suspense>` 로 감싼다
 * (`cacheComponents: true` 규약). `next` 는 proxy 의 로그인 리다이렉트가 실어 준 복귀 경로.
 */
async function LoginPanel({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={safeNext(next)} />;
}

export default function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg border" />}>
          <LoginPanel searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
