/**
 * 산림청 국립산림과학원 산불위험예보정보(시도) 연동 — 캐싱·오케스트레이션 (Task 043).
 *
 * 서버 전용. **시도 1회 호출로 전국 16개 시도가 모두 오므로** 산별 조회 대신 발표 슬롯 단위로만
 * 캐싱한다(`fire:sido:{yyyymmdd}:{slot}`). 원시 응답을 `'use cache'`(fire-3h)로 캐싱하고 순수
 * 코어(forest-fire-core.ts)로 시도별 지수를 정규화한 뒤, 산의 `region` → 대표 산불위험으로 환산한다.
 *
 * serviceKey 는 `.env.local` 에 Encoding 형태라 `decodeURIComponent` 로 미리 풀어 넘긴다
 * (fetcher 의 URLSearchParams 가 정확히 한 번만 인코딩 — 날씨·에어코리아·자외선과 동일 규칙).
 */

import { cacheLife, cacheTag } from "next/cache";
import type { FireRisk, PartialResult } from "@/lib/types";
import { serverEnv } from "@/lib/env";
import { fetchJson } from "./fetcher";
import { withStaleFallback } from "./cache";
import { CACHE_PROFILE, fireKey, sourceTag } from "./cache";
import {
  fireRiskForRegion,
  getFireSlot,
  normalizeFireSido,
  type FireSidoDatum,
  type FireSidoResponse,
} from "./forest-fire-core";

const FIRE_SIDO_URL = "https://apis.data.go.kr/1400377/forestPointV2/forestPointListSidoSearchV2";

/**
 * 시도 산불위험 원시 응답을 캐싱 조회한다(`'use cache'`, fire-3h).
 * 캐시 키는 발표 슬롯(3시간)으로 결정돼 같은 슬롯 재조회를 캐시 히트시킨다.
 */
async function fetchSidoFire(yyyymmdd: string, slot: string): Promise<FireSidoResponse> {
  "use cache";
  cacheLife(CACHE_PROFILE.fire);
  cacheTag(fireKey(yyyymmdd, slot), sourceTag("fire"));

  return fetchJson<FireSidoResponse>(FIRE_SIDO_URL, {
    searchParams: {
      serviceKey: decodeURIComponent(serverEnv.forestFireServiceKey),
      _type: "json",
      numOfRows: 20,
      pageNo: 1,
    },
  });
}

/**
 * 전국 시도 산불위험지수 맵(regioncode → datum)을 조회한다.
 * 실패 시 마지막 성공 스냅샷으로 폴백("N분 전 기준"), 없으면 failure. 절대 throw 하지 않는다.
 */
export async function getSidoFireRisk(
  now: Date = new Date(),
): Promise<PartialResult<Map<number, FireSidoDatum>>> {
  const { yyyymmdd, slot } = getFireSlot(now);
  const key = fireKey(yyyymmdd, slot);

  return withStaleFallback(key, async () => {
    const raw = await fetchSidoFire(yyyymmdd, slot);
    const normalized = normalizeFireSido(raw);
    if (normalized.status === "failure") {
      // producer 계약: 실패는 throw 로 신호. apiError 보존.
      throw Object.assign(new Error(normalized.error.message), { apiError: normalized.error });
    }
    return new Map(normalized.data.map((d) => [d.regioncode, d]));
  });
}

/**
 * 산의 `region` 기준 대표 산불위험을 조회한다.
 * - 시도 데이터 조회 실패/폴백 → 상태 승계(failure/stale)
 * - 시도는 왔지만 이 산의 지역이 매핑되지 않음 → failure(not_covered): 점수 계층이 fire 제외
 */
export async function getFireRiskForMountain(
  region: string,
  now: Date = new Date(),
): Promise<PartialResult<FireRisk>> {
  const sido = await getSidoFireRisk(now);

  if (sido.status === "failure") return { status: "failure", error: sido.error };

  const fire = fireRiskForRegion(region, sido.data);
  if (!fire) {
    return {
      status: "failure",
      error: {
        code: "not_covered",
        message: "이 지역의 산불위험 정보는 제공되지 않습니다.",
      },
    };
  }

  if (sido.status === "stale") {
    return { status: "stale", data: fire, fetchedAt: sido.fetchedAt, error: sido.error };
  }
  return { status: "success", data: fire, fetchedAt: sido.fetchedAt };
}
