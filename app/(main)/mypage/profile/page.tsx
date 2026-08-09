import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ChevronLeft } from "lucide-react";

import { LoadingBar } from "@/components/loading-bar";
import { ProfileEditForm } from "@/components/profile-edit-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllMountains } from "@/lib/data/mountains";
import { createClient } from "@/lib/supabase/server";

/**
 * 프로필 편집 화면 (마이페이지 하위, Task 038 후속). 본인만 접근하는 보호 라우트다.
 * `proxy.ts` 공개 경로가 아니라 자동으로 `/auth/login?next=/mypage/profile` 게이트되고,
 * 서버에서 `getClaims()` 로 이중 방어한다. 프로필 행 + 산 목록(가장 좋아하는 산 선택지)을
 * 함께 조회해 클라이언트 폼에 넘긴다.
 */

async function ProfileEditContent() {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    redirect("/auth/login?next=/mypage/profile");
  }
  const userId = claims.claims.sub;
  const claimEmail = typeof claims.claims.email === "string" ? claims.claims.email : null;

  const [{ data: profile }, mountains] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, email, username, full_name, avatar_icon, bio, favorite_mountain_id, home_region, experience_level",
      )
      .eq("id", userId)
      .maybeSingle(),
    getAllMountains(),
  ]);

  return (
    <ProfileEditForm
      profile={
        profile ?? {
          id: userId,
          email: claimEmail,
          username: null,
          full_name: null,
          avatar_icon: null,
          bio: null,
          favorite_mountain_id: null,
          home_region: null,
          experience_level: null,
        }
      }
      mountains={mountains.map((m) => ({ id: m.id, name: m.name, region: m.region }))}
    />
  );
}

function ProfileEditSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="프로필 불러오는 중">
      <LoadingBar />
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function ProfileEditPage() {
  return (
    <section className="flex flex-col gap-6 py-6">
      <div className="space-y-1">
        <Link
          href="/mypage"
          className="inline-flex h-8 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          마이페이지
        </Link>
        <h1 className="text-xl font-bold">프로필 편집</h1>
      </div>
      <Suspense fallback={<ProfileEditSkeleton />}>
        <ProfileEditContent />
      </Suspense>
    </section>
  );
}
