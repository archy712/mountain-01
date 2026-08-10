/**
 * 계절 콘텐츠 활성 판정 (Task 046, 2단계). 프레임워크·DB 무의존 순수 로직.
 *
 * 오늘(KST)이 각 큐레이션 항목의 기간에 드는지 판정해 **오늘 활성**인 항목만 추린다.
 * 기간·경계 계산은 `lib/trails/seasonal-closure.ts` 의 검증된 프리미티브
 * (`kstMonthDay` = 고정 UTC+9 자정 경계, `isWithinSeasonalPeriod` = 연말 wrap 지원)를
 * 재사용한다. 순수 함수라 경계일·연말 wrap 을 단위 검증할 수 있다(scratchpad/test-seasonal.ts).
 */

import type { SeasonalPeriod } from "@/lib/trails/seasonal-closure";
import { isWithinSeasonalPeriod, kstMonthDay } from "@/lib/trails/seasonal-closure";
import {
  SEASONAL_CONTENT,
  type SeasonalHighlight,
  type WildlifeCaution,
} from "@/lib/data/seasonal";

/**
 * 오늘(KST)이 기간 안(경계 포함)인지. `period` 가 없으면(상시 주의) 항상 true.
 * KST 자정 경계는 `kstMonthDay` 가 처리하므로, UTC 15:00 은 다음 날(KST)로 판정된다.
 */
export function isSeasonActive(
  period: SeasonalPeriod | undefined,
  now: Date = new Date(),
): boolean {
  if (!period) return true;
  const { month, day } = kstMonthDay(now);
  return isWithinSeasonalPeriod(period, month, day);
}

export interface ActiveSeasonalContent {
  highlights: SeasonalHighlight[];
  cautions: WildlifeCaution[];
}

/**
 * 산의 큐레이션 콘텐츠 중 **오늘(KST) 활성**인 항목만 반환한다.
 * - highlights: 기간에 든 것만.
 * - cautions: 기간에 들거나 상시(period 없음)인 것만.
 * 미보유 산이거나 활성 항목이 하나도 없으면 `null` → 상세에서 섹션 미노출.
 */
export function getActiveSeasonalContent(
  mountainId: string,
  now: Date = new Date(),
): ActiveSeasonalContent | null {
  const content = SEASONAL_CONTENT[mountainId];
  if (!content) return null;

  const highlights = content.highlights.filter((h) => isSeasonActive(h.period, now));
  const cautions = content.cautions.filter((c) => isSeasonActive(c.period, now));

  if (highlights.length === 0 && cautions.length === 0) return null;
  return { highlights, cautions };
}
