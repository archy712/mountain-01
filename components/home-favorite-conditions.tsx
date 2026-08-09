import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Heart } from "lucide-react";

import { FavoriteScore, FavoriteScoreSkeleton } from "@/components/favorite-score";
import { HomeMountainCard } from "@/components/home-mountain-card";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

/**
 * 홈 "내 산 오늘 컨디션" 블록 (개인화). 로그인 + 즐겨찾기가 있을 때만 노출한다.
 *
 * - 비로그인 → `null`(블록 자체를 숨김).
 * - 로그인 + 즐겨찾기 없음 → 얇은 유도 카드(즐겨찾기 사용법 안내).
 * - 로그인 + 즐겨찾기 있음 → 최근 저장 상위 3곳을 카드로, 각 산의 오늘 컨디션 점수를
 *   **카드별 `<Suspense>` 스트리밍**(`FavoriteScore`, 즐겨찾기 화면과 동일 패턴)한다.
 * 세션·개인 데이터라 매 요청 달라지므로 `connection()` 으로 동적 홀임을 명시한다.
 */

const HOME_FAVORITE_LIMIT = 3;

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

function EmptyHint() {
  return (
    <section aria-labelledby="my-conditions-heading" className="space-y-3">
      <h2 id="my-conditions-heading" className="text-sm font-semibold text-muted-foreground">
        내 산 오늘 컨디션
      </h2>
      <Link href="/top100" className="block">
        <Card className="flex min-h-11 items-center gap-3 p-4 shadow-sm transition-colors hover:bg-accent">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Heart className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold tracking-tight">즐겨찾기한 산이 아직 없어요</span>
            <span className="block text-xs text-muted-foreground">
              자주 가는 산을 저장하면 오늘 컨디션을 여기서 한눈에 볼 수 있어요.
            </span>
          </span>
        </Card>
      </Link>
    </section>
  );
}

export async function HomeFavoriteConditions() {
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return null; // 비로그인 → 블록 숨김

  const { data } = await supabase
    .from("favorites")
    .select("mountain_id, mountains(id, name, region, altitude, grid_nx, grid_ny, lat, lng)")
    .order("created_at", { ascending: false })
    .limit(HOME_FAVORITE_LIMIT);

  const mountains = ((data ?? []) as FavoriteRow[])
    .map((r) => r.mountains)
    .filter((m): m is FavoriteMountain => m !== null);

  if (mountains.length === 0) return <EmptyHint />;

  return (
    <section aria-labelledby="my-conditions-heading" className="space-y-3">
      <h2 id="my-conditions-heading" className="text-sm font-semibold text-muted-foreground">
        내 산 오늘 컨디션
      </h2>
      <ul className="grid grid-cols-2 gap-3">
        {mountains.map((m) => (
          <li key={m.id}>
            <HomeMountainCard
              id={m.id}
              name={m.name}
              region={m.region}
              altitude={m.altitude}
              chip={
                <Suspense fallback={<FavoriteScoreSkeleton />}>
                  <FavoriteScore
                    mountain={{
                      id: m.id,
                      gridNx: m.grid_nx,
                      gridNy: m.grid_ny,
                      lat: m.lat,
                      lng: m.lng,
                    }}
                  />
                </Suspense>
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
