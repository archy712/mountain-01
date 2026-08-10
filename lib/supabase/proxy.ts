import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // 공개 경로: 1단계 전면 비로그인 정책 (결정 002 #12 / 확정 라우트 표).
  // `/`, `/mountains/*`(상세·지도), `/top100`(100대명산 목록), `/discover`(산 추천),
  // `/offline`, 인증 흐름(`/auth/*`, `/login*`)은 로그인 없이 접근 가능.
  // 그 외(`/favorites`, `/protected/*` 등)는 인증 요구.
  const { pathname } = request.nextUrl;
  const isPublicPath =
    pathname === "/" ||
    pathname === "/offline" ||
    pathname === "/top100" ||
    pathname === "/discover" ||
    pathname === "/mountains" ||
    pathname.startsWith("/mountains/") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    // API 라우트는 페이지 로그인 리다이렉트(HTML) 대상이 아니다. 공개 데이터 API
    // (날씨·탐방로 등, 비로그인 상세 페이지가 소비)는 그대로 열고, 인증이 필요한
    // API(예: /api/favorites, Task 026)는 라우트 핸들러가 직접 401 JSON 을 반환한다.
    pathname.startsWith("/api/");

  if (!user && !isPublicPath) {
    // 미인증 → 로그인 페이지로. 원래 목적지(pathname+query)를 `next` 로 실어
    // 로그인 성공 후 복귀시킨다(Task 025). 쿠키 처리에는 관여하지 않는다.
    const url = request.nextUrl.clone();
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.pathname = "/auth/login";
    url.search = "";
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
