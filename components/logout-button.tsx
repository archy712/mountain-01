"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // 로그아웃 후 공개 홈으로. (로그인 페이지 대신 1단계 기능을 바로 쓸 수 있게)
    router.push("/");
    router.refresh();
  };

  return (
    <Button onClick={logout} size="sm" variant="outline" className="h-11">
      로그아웃
    </Button>
  );
}
