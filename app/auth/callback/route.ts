import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// OAuth(PKCE) 콜백 핸들러. signInWithOAuth 후 Supabase가 code와 함께
// 이 경로로 리다이렉트하면 code를 세션으로 교환한다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/favorites";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 로컬은 origin, 프록시(배포) 환경에서는 x-forwarded-host를 사용
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
    return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(
    `${origin}/auth/error?error=${encodeURIComponent("No code provided in OAuth callback")}`,
  );
}
