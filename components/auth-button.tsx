import Link from "next/link";
import { CircleCheck, Heart } from "lucide-react";

import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

/**
 * 헤더 인증 컨트롤 (모바일 우선, Task 025).
 *
 * 즐겨찾기·방문완료 링크는 항상 노출한다 — 비로그인 상태에서 누르면 proxy 가
 * `/auth/login?next=…` 로 보내 로그인 후 복귀시킨다(로그인 유도 UX). 로그인 여부에 따라
 * 로그인/로그아웃을 토글한다. 세션 확인은 코드베이스 관례대로 `getClaims()` 사용.
 * (Task 038 마이페이지에서 이 진입점들을 통합 검토 예정)
 */
export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return (
    <div className="flex items-center gap-1">
      {/* 터치 타깃 44px 보장(Task 033): 모바일 아이콘 전용일 때도 min-w-11 로 44×44 확보 */}
      <Button asChild size="sm" variant="ghost" className="h-11 min-w-11 gap-1.5">
        <Link href="/visited" aria-label="방문완료">
          <CircleCheck className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">방문완료</span>
        </Link>
      </Button>
      <Button asChild size="sm" variant="ghost" className="h-11 min-w-11 gap-1.5">
        <Link href="/favorites" aria-label="즐겨찾기">
          <Heart className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">즐겨찾기</span>
        </Link>
      </Button>
      {user ? (
        <LogoutButton />
      ) : (
        <Button asChild size="sm" variant="outline" className="h-11">
          <Link href="/auth/login">로그인</Link>
        </Button>
      )}
    </div>
  );
}
