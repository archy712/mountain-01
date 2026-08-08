import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Heart, Mountain as MountainIcon, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getMockCondition, getMountainById } from "@/lib/mock";
import { SCORE_GRADE_LABEL, type Mountain, type ScoreGrade } from "@/lib/types";

/**
 * 즐겨찾기 화면 (Task 012 UI · Task 025 인증 게이트).
 *
 * 보호 라우트다. proxy.ts 가 비로그인 요청을 `/auth/login?next=/favorites` 로 리다이렉트하고,
 * 이 서버 컴포넌트가 `getClaims()` 로 **이중 방어**한다(미인증이면 로그인으로 재차 redirect).
 * 따라서 여기 도달하는 사용자는 항상 인증 상태다. 목록은 아직 더미 데이터이며 favorites
 * CRUD·실데이터 연동은 Task 026에서 대체한다. `?state=empty` 로 빈 상태를 확인할 수 있다.
 */

const DUMMY_FAVORITE_IDS = ["bukhansan", "seoraksan", "hallasan"];

const GRADE_CHIP: Record<ScoreGrade, string> = {
  excellent: "border-grade-excellent/30 bg-grade-excellent/10 text-grade-excellent",
  good: "border-grade-good/30 bg-grade-good/10 text-grade-good",
  fair: "border-grade-fair/30 bg-grade-fair/10 text-grade-fair",
  poor: "border-grade-poor/30 bg-grade-poor/10 text-grade-poor",
  dangerous: "border-grade-dangerous/30 bg-grade-dangerous/10 text-grade-dangerous",
};

/** 요약 컨디션 점수 칩 — 색상 단독 구분 금지: 점수 + 등급 텍스트 병기 */
function ScoreChip({ score, grade }: { score: number; grade: ScoreGrade }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        GRADE_CHIP[grade],
      )}
    >
      <span className="tabular-nums">{score}</span>
      <span>{SCORE_GRADE_LABEL[grade]}</span>
    </span>
  );
}

function FavoriteCard({ mountain }: { mountain: Mountain }) {
  const condition = getMockCondition(mountain.id);

  return (
    <Link href={`/mountains/${mountain.id}`} className="block">
      <Card className="flex items-center gap-3 p-4 shadow-sm transition-colors hover:bg-accent">
        <MountainIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold tracking-tight">{mountain.name}</span>
            {condition ? <ScoreChip score={condition.score} grade={condition.grade} /> : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {mountain.region}
            {mountain.altitude !== null ? ` · ${mountain.altitude.toLocaleString()}m` : ""}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Card>
    </Link>
  );
}

/** 저장한 산이 없을 때 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center">
      <Heart className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">아직 저장한 산이 없어요</p>
        <p className="text-sm text-muted-foreground">
          산 상세 화면의 하트를 눌러 자주 가는 산을 저장해 보세요.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
      >
        <Search className="size-4" aria-hidden="true" />산 검색하기
      </Link>
    </div>
  );
}

/**
 * 세션·검색데이터(요청 데이터) 접근부를 async 컴포넌트로 분리해 `<Suspense>` 로 감싼다
 * (`cacheComponents: true` 규약). 인증 이중 방어를 여기서 수행한다.
 */
async function FavoritesContent({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    // proxy 를 우회해 도달한 경우까지 막는 이중 방어(결정 002 #12).
    redirect("/auth/login?next=/favorites");
  }

  const { state } = await searchParams;
  const favorites =
    state === "empty"
      ? []
      : DUMMY_FAVORITE_IDS.map((id) => getMountainById(id)).filter(
          (m): m is Mountain => m !== undefined,
        );

  if (favorites.length === 0) return <EmptyState />;

  return (
    <ul className="flex flex-col gap-3">
      {favorites.map((mountain) => (
        <li key={mountain.id}>
          <FavoriteCard mountain={mountain} />
        </li>
      ))}
    </ul>
  );
}

export default function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  return (
    <section className="flex flex-col gap-6 py-6">
      <h1 className="text-xl font-bold">즐겨찾기</h1>
      <Suspense fallback={<div className="h-24 animate-pulse rounded-lg border border-dashed" />}>
        <FavoritesContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
