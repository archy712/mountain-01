/**
 * 도메인 타입 배럴. `@/lib/types` 로 일괄 import.
 */

export * from "./api";
export * from "./mountain";
export * from "./weather";
export * from "./air";
export * from "./condition";

import type { PartialResult } from "./api";
import type { Mountain, Trail } from "./mountain";
import type { WeatherSnapshot } from "./weather";
import type { AirQuality, UvIndex } from "./air";
import type { ConditionScore, GearItem } from "./condition";

/**
 * 산 상세 화면의 표준 집계 스키마 (Task 010·019).
 * 소스별로 독립 `PartialResult` 를 담아 부분 실패를 격리한다.
 * - 1단계(MVP): mountain·weather·trails
 * - 2단계: air·uv·condition·gear 추가
 */
export interface MountainDetailData {
  mountain: Mountain;
  weather: PartialResult<WeatherSnapshot>;
  trails: PartialResult<Trail[]>;
  air?: PartialResult<AirQuality>;
  uv?: PartialResult<UvIndex>;
  condition?: PartialResult<ConditionScore>;
  gear?: GearItem[];
}
