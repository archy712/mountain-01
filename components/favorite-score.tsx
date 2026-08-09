import { connection } from "next/server";

import { ConditionChip, ConditionChipSkeleton } from "@/components/condition-chip";
import { getConditionForMountain, type ConditionMountainInput } from "@/lib/condition";
import { hasData } from "@/lib/types";

/**
 * 즐겨찾기 카드의 컨디션 점수 칩 — 카드별 독립 스트리밍 (즐겨찾기 로딩 UX 개선).
 *
 * 산 목록(이름·지역)은 DB 한 번으로 즉시 렌더하고, 각 산의 점수(외부 API: 날씨·대기·자외선)
 * 만 이 서버 컴포넌트가 `<Suspense>` 경계 안에서 **독립적으로** 산출한다. 한 산이 느려도
 * 리스트 전체·다른 카드는 막히지 않는다(`PartialResult` 가 실패도 격리). 칩 마크업은 홈
 * 컨디션 블록과 공유하는 `ConditionChip`(`components/condition-chip.tsx`) 을 쓴다.
 */

/** 점수 산출 대기용 로딩 칩(공용 스켈레톤 재노출 — 기존 import 경로 유지). */
export { ConditionChipSkeleton as FavoriteScoreSkeleton };

/** 산 하나의 컨디션 점수 칩을 스트리밍한다. 점수 계산 불가(날씨 실패 등)면 아무것도 렌더하지 않는다. */
export async function FavoriteScore({ mountain }: { mountain: ConditionMountainInput }) {
  await connection();
  const condition = await getConditionForMountain(mountain);
  if (!hasData(condition)) return null;
  const { score } = condition.data;
  return <ConditionChip score={score.score} grade={score.grade} />;
}
