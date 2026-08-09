import { connection } from "next/server";

import { ConditionChip } from "@/components/condition-chip";
import { HomeMountainCard } from "@/components/home-mountain-card";
import { getConditionForMountain } from "@/lib/condition";
import { getPopularMountainsGeo } from "@/lib/data/mountains";
import { hasData } from "@/lib/types";

/**
 * 홈 "지금 갈 만한 산" 블록 (모든 사용자). 후보 풀의 **오늘 컨디션을 실제로 계산해
 * 점수 높은 순으로 정렬**한 상위 4곳을 보여준다 — 라벨이 데이터와 일치한다("인기 산"
 * 이라던 예전 블록은 로그가 없으면 이름순 백필이라 사실상 임의였다).
 *
 * 비용/차단 관리: 후보 풀은 소수(8곳)로 제한하고 컨디션을 병렬 계산한다. 정렬을 위해
 * 풀 전체를 기다려야 하므로(카드별 스트리밍 불가) 이 블록은 홈에서 독립 `<Suspense>` 로
 * 감싸 나머지(히어로·검색·즐겨찾기)를 막지 않게 한다. 날씨 실패로 점수가 없는 산은
 * 랭킹에서 제외하고, 전부 실패하면 블록을 숨긴다. 동적 데이터라 `connection()` 명시.
 */

const CANDIDATE_POOL = 8;
const VISIBLE_PICKS = 4;

export async function TodayConditionPicks() {
  await connection();
  const pool = await getPopularMountainsGeo(CANDIDATE_POOL);
  if (pool.length === 0) return null;

  const scored = await Promise.all(
    pool.map(async (m) => {
      const condition = await getConditionForMountain({
        id: m.id,
        gridNx: m.gridNx,
        gridNy: m.gridNy,
        lat: m.lat,
        lng: m.lng,
      });
      return { mountain: m, score: hasData(condition) ? condition.data.score : null };
    }),
  );

  const ranked = scored
    // score 가 있는 항목만 남기며 동시에 타입을 non-null 로 좁힌다(assertion 없이).
    .flatMap((s) => (s.score ? [{ mountain: s.mountain, score: s.score }] : []))
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, VISIBLE_PICKS);

  // 후보 전원의 컨디션 계산이 실패(날씨 소스 다운 등)하면 블록을 숨긴다.
  if (ranked.length === 0) return null;

  return (
    <section aria-labelledby="today-picks-heading" className="space-y-3">
      <div className="space-y-0.5">
        <h2 id="today-picks-heading" className="text-sm font-semibold text-muted-foreground">
          지금 갈 만한 산
        </h2>
        <p className="text-xs text-muted-foreground">오늘 컨디션이 좋은 순</p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {ranked.map(({ mountain, score }) => (
          <li key={mountain.id}>
            <HomeMountainCard
              id={mountain.id}
              name={mountain.name}
              region={mountain.region}
              altitude={mountain.altitude}
              chip={<ConditionChip score={score.score} grade={score.grade} />}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
