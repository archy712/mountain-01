import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { FavoritesList, type FavoriteItem } from "@/components/favorites-list";
import { FavoriteScore, FavoriteScoreSkeleton } from "@/components/favorite-score";
import { FavoritesListSkeleton } from "@/components/favorites-list-skeleton";
import { createClient } from "@/lib/supabase/server";

/**
 * 즐겨찾기 화면 (Task 026 실데이터 · Task 025 인증 게이트 · 즐겨찾기 로딩 UX 개선).
 *
 * 보호 라우트다. proxy.ts 가 비로그인 요청을 `/auth/login?next=/favorites` 로 보내고,
 * 이 서버 컴포넌트가 `getClaims()` 로 **이중 방어**한다. 목록은 RLS 로 본인 행만 조회된다.
 *
 * 로딩 UX: 산 목록(이름·지역)은 DB 한 번으로 **즉시** 렌더하고, 각 산의 컨디션 점수(외부 API)
 * 는 카드별 `<Suspense>` 로 **독립 스트리밍**한다(`FavoriteScore`). 예전엔 모든 산의 점수를
 * 한꺼번에 await 해 가장 느린 산이 전체 화면을 막았다(로그인 직후 "멈춤"처럼 보임).
 * 삭제(인라인)·낙관적 업데이트는 클라이언트 `FavoritesList` 가 담당한다.
 */

type FavoriteMountain = {
  id: string;
  name: string;
  region: string;
  altitude: number | null;
  grid_nx: number;
  grid_ny: number;
  lat: number;
  lng: number;
};

type FavoriteRow = {
  mountain_id: string;
  mountains: FavoriteMountain | null;
};

/** 저장한 산 메타만 조회한다(DB 전용, 빠름). 점수는 카드별로 별도 스트리밍한다. */
async function loadFavoriteMountains(): Promise<FavoriteMountain[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("favorites")
    .select("mountain_id, mountains(id, name, region, altitude, grid_nx, grid_ny, lat, lng)")
    .order("created_at", { ascending: false });

  return ((data ?? []) as FavoriteRow[])
    .map((r) => r.mountains)
    .filter((m): m is FavoriteMountain => m !== null);
}

/**
 * 세션·목록(요청 데이터) 접근부를 async 컴포넌트로 분리해 `<Suspense>` 로 감싼다
 * (`cacheComponents: true` 규약). 인증 이중 방어를 여기서 수행한다.
 */
async function FavoritesContent() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    // proxy 를 우회해 도달한 경우까지 막는 이중 방어(결정 002 #12).
    redirect("/auth/login?next=/favorites");
  }

  const mountains = await loadFavoriteMountains();
  const items: FavoriteItem[] = mountains.map((m) => ({
    mountainId: m.id,
    name: m.name,
    region: m.region,
    altitude: m.altitude,
    // 점수 칩은 카드별로 독립 스트리밍(느린 산이 리스트를 막지 않음).
    scoreSlot: (
      <Suspense fallback={<FavoriteScoreSkeleton />}>
        <FavoriteScore
          mountain={{
            id: m.id,
            gridNx: m.grid_nx,
            gridNy: m.grid_ny,
            lat: m.lat,
            lng: m.lng,
            region: m.region,
          }}
        />
      </Suspense>
    ),
  }));

  return <FavoritesList initial={items} />;
}

export default function FavoritesPage() {
  return (
    <section className="flex flex-col gap-6 py-6">
      <h1 className="text-xl font-bold">즐겨찾기</h1>
      <Suspense fallback={<FavoritesListSkeleton />}>
        <FavoritesContent />
      </Suspense>
    </section>
  );
}
