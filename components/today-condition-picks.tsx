import { Suspense } from "react";

import { ConditionChipSkeleton } from "@/components/condition-chip";
import { FavoriteScore } from "@/components/favorite-score";
import { HomeMountainCard } from "@/components/home-mountain-card";
import { HomeReviewCount } from "@/components/home-review-count";
import { getPopularMountainsGeo } from "@/lib/data/mountains";
import type { Mountain } from "@/lib/types";

/**
 * 홈 "지금 갈 만한 산" 블록 (모든 사용자) — **카드별 스트리밍**.
 *
 * 예전엔 후보 8곳의 컨디션을 전부 계산해 점수순 정렬했는데, 정렬을 위해 8곳×(날씨·대기·자외선)
 * 최대 24개 외부 호출을 **모두 기다린 뒤에야** 카드가 그려져 로그아웃 첫 방문(콜드 캐시)에서
 * 체감이 느렸다. 이제 **큐레이션 대표 산 4곳을 이름·지역·고도로 즉시 렌더**하고(값싼 DB,
 * `'use cache'` → 정적 셸에 포함), 각 산의 오늘 컨디션 칩만 카드별 `<Suspense>` 로 독립
 * 스트리밍한다(로그인 사용자의 "내 산 컨디션"·즐겨찾기 화면과 동일 패턴). 접속 즉시 유용한
 * 산 목록이 보이고 점수는 `fade-in` 으로 채워진다. 엄격한 컨디션순 정렬은 포기한다(홈은
 * 진입점이라 즉시성이 정렬보다 중요). 컨디션 계산 실패 카드는 칩만 비고 카드는 유지된다.
 */

const VISIBLE_PICKS = 4;

export async function TodayConditionPicks() {
  // 값싼 DB 조회(`'use cache'`). 후보를 넉넉히 받아 동명 산(예: 지리산 1,915m vs 399m)을
  // 이름 기준으로 합치되 **가장 높은 산을 대표로**(대개 유명한 쪽) 남긴다. Map 은 첫 등장
  // 순서(=큐레이션 순위)를 유지하므로 값만 갱신하면 순서는 그대로다. connection() 을 쓰지
  // 않아 카드 메타는 정적 셸에 포함된다.
  const pool = await getPopularMountainsGeo(8);
  const byName = new Map<string, Mountain>();
  for (const m of pool) {
    const current = byName.get(m.name);
    if (!current || (m.altitude ?? 0) > (current.altitude ?? 0)) byName.set(m.name, m);
  }
  const picks = Array.from(byName.values()).slice(0, VISIBLE_PICKS);
  if (picks.length === 0) return null;

  return (
    <section aria-labelledby="today-picks-heading" className="space-y-3">
      <div className="space-y-0.5">
        <h2 id="today-picks-heading" className="text-sm font-semibold text-muted-foreground">
          지금 갈 만한 산
        </h2>
        <p className="text-xs text-muted-foreground">오늘 컨디션을 확인해 보세요</p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {picks.map((m) => (
          <li key={m.id}>
            <HomeMountainCard
              id={m.id}
              name={m.name}
              region={m.region}
              altitude={m.altitude}
              chip={
                <Suspense fallback={<ConditionChipSkeleton />}>
                  <FavoriteScore
                    mountain={{
                      id: m.id,
                      gridNx: m.gridNx,
                      gridNy: m.gridNy,
                      lat: m.lat,
                      lng: m.lng,
                      region: m.region,
                    }}
                  />
                </Suspense>
              }
              reviewSlot={
                <Suspense fallback={null}>
                  <HomeReviewCount mountainId={m.id} />
                </Suspense>
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
