import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  Award,
  ChevronRight,
  CircleCheck,
  Heart,
  Mountain as MountainIcon,
  UserPen,
} from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { MypageNavCard } from "@/components/mypage-nav-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingBar } from "@/components/loading-bar";
import {
  EXPERIENCE_LABEL,
  isExperienceLevel,
  normalizeAvatarIcon,
} from "@/lib/profile/profile-options";
import { createClient } from "@/lib/supabase/server";

/**
 * 마이페이지 — 개인화 허브 (Task 038).
 *
 * 로그인 사용자의 프로필 요약 + 즐겨찾기·방문완료 진입(개수 배지)을 모은다. 앞으로 추가될
 * 개인화 화면(알림 설정 등)의 확장 지점이다. 보호 라우트: `proxy.ts` 공개 경로가 아니라
 * 자동으로 `/auth/login?next=/mypage` 로 게이트되고, 이 서버 컴포넌트가 `getClaims()` 로
 * 이중 방어한다(즐겨찾기·방문완료와 동일 패턴). 개수는 RLS 로 본인 행만 집계된다.
 */

type ProfileSummary = {
  email: string | null;
  username: string | null;
  full_name: string | null;
  avatar_icon: string | null;
};

type FavoriteMountainRef = { id: string; name: string; region: string } | null;

/** 표시 이름: 실명 → username → 이메일 local part 순으로 폴백. */
function displayName(profile: ProfileSummary): string {
  const name = profile.full_name?.trim() || profile.username?.trim();
  if (name) return name;
  const email = profile.email ?? "";
  const local = email.split("@")[0];
  return local || "등산객";
}

/** FK 임베드는 to-one 이라도 배열/객체로 올 수 있어 단일 객체로 정규화한다. */
function normalizeFavoriteMountain(raw: unknown): FavoriteMountainRef {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const { id, name, region } = row as Record<string, unknown>;
  if (typeof id === "string" && typeof name === "string" && typeof region === "string") {
    return { id, name, region };
  }
  return null;
}

async function MypageContent() {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    // proxy 를 우회해 도달한 경우까지 막는 이중 방어(결정 002 #12).
    redirect("/auth/login?next=/mypage");
  }
  const userId = claims.claims.sub;
  const claimEmail = typeof claims.claims.email === "string" ? claims.claims.email : null;

  // 프로필 + 즐겨찾기/방문완료 개수를 병렬 조회(개수는 head 요청으로 행 전송 없이).
  // 가장 좋아하는 산은 FK 임베드로 이름·지역을 함께 가져온다(별도 쿼리 불필요).
  const [{ data: profile }, { count: favoriteCount }, { count: visitedCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "email, username, full_name, avatar_icon, bio, experience_level, favorite_mountain:favorite_mountain_id(id, name, region)",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("favorites").select("*", { count: "exact", head: true }),
    supabase.from("visited").select("*", { count: "exact", head: true }),
  ]);

  const summary: ProfileSummary = profile ?? {
    email: claimEmail,
    username: null,
    full_name: null,
    avatar_icon: null,
  };
  const name = displayName(summary);
  const email = summary.email ?? claimEmail;
  const avatarIcon = normalizeAvatarIcon(summary.avatar_icon);
  const initial = name.charAt(0).toUpperCase();
  const bio = profile?.bio?.trim() || null;
  const expLevel = profile?.experience_level ?? null;
  const experienceLabel =
    expLevel && isExperienceLevel(expLevel) ? EXPERIENCE_LABEL[expLevel] : null;
  const favoriteMountain = normalizeFavoriteMountain(profile?.favorite_mountain);

  return (
    <div className="space-y-6">
      {/* 프로필 요약 */}
      <Card className="flex flex-col gap-3 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary"
            aria-hidden="true"
          >
            {avatarIcon ?? initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold tracking-tight">{name}</p>
            {email ? <p className="truncate text-sm text-muted-foreground">{email}</p> : null}
          </div>
        </div>

        {bio ? <p className="text-sm whitespace-pre-line text-foreground/90">{bio}</p> : null}

        {favoriteMountain || experienceLabel ? (
          <div className="flex flex-wrap items-center gap-2">
            {favoriteMountain ? (
              <Link
                href={`/mountains/${favoriteMountain.id}`}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <MountainIcon className="size-3.5" aria-hidden="true" />
                <span className="text-foreground/80">최애 산</span>
                <span className="font-semibold text-foreground">{favoriteMountain.name}</span>
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
            {experienceLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Award className="size-3.5" aria-hidden="true" />
                <span className="text-foreground/80">경력</span>
                <span className="font-semibold text-foreground">{experienceLabel}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </Card>

      {/* 개인화 진입 */}
      <nav aria-label="개인화 메뉴" className="flex flex-col gap-3">
        <MypageNavCard
          href="/favorites"
          icon={Heart}
          label="즐겨찾기"
          description="저장한 산의 오늘 컨디션"
          count={favoriteCount ?? null}
        />
        <MypageNavCard
          href="/visited"
          icon={CircleCheck}
          label="방문완료"
          description="다녀온 산 기록"
          count={visitedCount ?? null}
        />
        <MypageNavCard
          href="/mypage/profile"
          icon={UserPen}
          label="프로필 편집"
          description="아이콘·이름·자기소개·좋아하는 산"
          count={null}
        />
      </nav>

      <div className="pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}

function MypageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="마이페이지 불러오는 중">
      <LoadingBar />
      <Card className="flex flex-col gap-3 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </Card>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="flex min-h-11 items-center gap-3 p-4 shadow-sm">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function MypagePage() {
  return (
    <section className="flex flex-col gap-6 py-6">
      <h1 className="text-xl font-bold">마이페이지</h1>
      <Suspense fallback={<MypageSkeleton />}>
        <MypageContent />
      </Suspense>
    </section>
  );
}
