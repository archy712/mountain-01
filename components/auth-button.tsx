import Link from "next/link";
import { CircleUser } from "lucide-react";

import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

/**
 * 헤더 인증 컨트롤 (모바일 우선, Task 025 → Task 038 마이페이지 통합).
 *
 * 로그인 시 개인화 진입점을 **마이페이지 단일 링크**로 통합한다(예전엔 즐겨찾기·방문완료
 * 링크를 헤더에 직접 노출 — 개인화 화면이 늘수록 헤더가 비좁아짐). 즐겨찾기·방문완료는
 * `/mypage` 안에서 진입한다. 비로그인 시에는 로그인 버튼만 노출한다(보호 라우트인 `/mypage`
 * 는 proxy 가 로그인으로 유도). 세션 확인은 코드베이스 관례대로 `getClaims()` 사용.
 */
export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    return (
      <Button asChild size="sm" variant="outline" className="h-11">
        <Link href="/auth/login">로그인</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {/* 터치 타깃 44px 보장(Task 033): 아이콘 전용일 때도 min-w-11 로 44×44 확보 */}
      <Button asChild size="sm" variant="ghost" className="h-11 min-w-11 gap-1.5">
        <Link href="/mypage" aria-label="마이페이지">
          <CircleUser className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">마이페이지</span>
        </Link>
      </Button>
      <LogoutButton />
    </div>
  );
}
