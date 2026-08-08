import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { FavoritesList, type FavoriteItem } from "@/components/favorites-list";
import { getConditionForMountain } from "@/lib/condition";
import { createClient } from "@/lib/supabase/server";
import { hasData } from "@/lib/types";

/**
 * 즐겨찾기 화면 (Task 026 실데이터 · Task 025 인증 게이트).
 *
 * 보호 라우트다. proxy.ts 가 비로그인 요청을 `/auth/login?next=/favorites` 로 보내고,
 * 이 서버 컴포넌트가 `getClaims()` 로 **이중 방어**한다. 목록은 RLS 로 본인 행만 조회되며,
 * 각 산의 컨디션 점수 요약을 함께 산출한다(원천 데이터는 `'use cache'` 로 캐시됨).
 * 삭제(인라인)·낙관적 업데이트는 클라이언트 `FavoritesList` 가 담당한다.
 */

type FavoriteRow = {
  mountain_id: string;
  mountains: {
    id: string;
    name: string;
    region: string;
    altitude: number | null;
    grid_nx: number;
    grid_ny: number;
    lat: number;
    lng: number;
  } | null;
};

/** 저장한 산 + 각 산의 컨디션 점수 요약을 만든다(점수 계산 불가 시 null). */
async function loadFavorites(): Promise<FavoriteItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("favorites")
    .select("mountain_id, mountains(id, name, region, altitude, grid_nx, grid_ny, lat, lng)")
    .order("created_at", { ascending: false });

  const rows = ((data ?? []) as FavoriteRow[]).filter((r) => r.mountains !== null);

  return Promise.all(
    rows.map(async (row): Promise<FavoriteItem> => {
      const m = row.mountains!;
      const condition = await getConditionForMountain({
        id: m.id,
        gridNx: m.grid_nx,
        gridNy: m.grid_ny,
        lat: m.lat,
        lng: m.lng,
      });
      const score = hasData(condition) ? condition.data.score : null;
      return {
        mountainId: m.id,
        name: m.name,
        region: m.region,
        altitude: m.altitude,
        score: score ? score.score : null,
        grade: score ? score.grade : null,
      };
    }),
  );
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

  const items = await loadFavorites();
  return <FavoritesList initial={items} />;
}

export default function FavoritesPage() {
  return (
    <section className="flex flex-col gap-6 py-6">
      <h1 className="text-xl font-bold">즐겨찾기</h1>
      <Suspense fallback={<div className="h-24 animate-pulse rounded-lg border border-dashed" />}>
        <FavoritesContent />
      </Suspense>
    </section>
  );
}
