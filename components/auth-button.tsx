import Link from "next/link";
import { Heart } from "lucide-react";

import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

/**
 * 헤더 인증 컨트롤 (모바일 우선, Task 025).
 *
 * 즐겨찾기 링크는 항상 노출한다 — 비로그인 상태에서 누르면 proxy 가 `/auth/login?next=/favorites`
 * 로 보내 로그인 후 복귀시킨다(로그인 유도 UX). 로그인 여부에 따라 로그인/로그아웃을 토글한다.
 * 세션 확인은 코드베이스 관례대로 `getClaims()` 사용.
 */
export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return (
    <div className="flex items-center gap-1">
      <Button asChild size="sm" variant="ghost" className="gap-1.5">
        <Link href="/favorites" aria-label="즐겨찾기">
          <Heart className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">즐겨찾기</span>
        </Link>
      </Button>
      {user ? (
        <LogoutButton />
      ) : (
        <Button asChild size="sm" variant="outline">
          <Link href="/auth/login">로그인</Link>
        </Button>
      )}
    </div>
  );
}
