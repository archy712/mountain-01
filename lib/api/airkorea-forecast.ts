/**
 * 에어코리아 대기질 예보통보(getMinuDustFrcstDspth) 연동 — 캐싱·오케스트레이션 (Task 052).
 *
 * 서버 전용. 실시간 측정값(`airkorea.ts`, 오늘·지금)과 달리 **오늘·내일 예보 등급**(권역
 * 단위)을 노출한다. **1회 호출로 전 권역이 모두 오므로** 산별 조회 대신 발표 슬롯 단위로만
 * 캐싱한다(`dust:{yyyymmdd}:{slot}`). 원시 응답을 `'use cache'`(dust-6h)로 캐싱하고 순수
 * 코어(airkorea-forecast-core.ts)로 정규화한 뒤, 산의 `region` → 예보권역으로 환산한다.
 *
 * **신규 키 불필요** — 실시간 측정과 같은 서비스(`ArpltnInforInqireSvc`)의 다른 오퍼레이션이라
 * 기존 `AIRKOREA_SERVICE_KEY` 를 그대로 쓴다. serviceKey 는 `.env.local` 에 Encoding 형태라
 * `decodeURIComponent` 로 미리 풀어 넘긴다(fetcher 의 URLSearchParams 가 정확히 한 번만 인코딩).
 */

import { cacheLife, cacheTag } from "next/cache";
import type { DustForecast, PartialResult } from "@/lib/types";
import { serverEnv } from "@/lib/env";
import { fetchJson } from "./fetcher";
import { withStaleFallback } from "./cache";
import { CACHE_PROFILE, dustKey, sourceTag } from "./cache";
import {
  dustForecastForRegion,
  getDustSlot,
  getForecastDates,
  normalizeDustForecast,
  type DustForecastResponse,
  type ParsedDustForecast,
} from "./airkorea-forecast-core";

const DUST_FORECAST_URL =
  "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth";

/**
 * 예보통보 원시 응답을 캐싱 조회한다(`'use cache'`, dust-6h).
 * 캐시 키는 발표 슬롯으로 결정돼 같은 발표분 재조회를 캐시 히트시킨다.
 */
async function fetchDustForecast(
  searchDate: string,
  yyyymmdd: string,
  slot: string,
): Promise<DustForecastResponse> {
  "use cache";
  cacheLife(CACHE_PROFILE.dust);
  cacheTag(dustKey(yyyymmdd, slot), sourceTag("dust"));

  return fetchJson<DustForecastResponse>(DUST_FORECAST_URL, {
    // 에어코리아 게이트웨이는 no-store 요청을 거부(503/행)하므로 "default" 로 호출한다.
    cache: "default",
    searchParams: {
      serviceKey: decodeURIComponent(serverEnv.airkoreaServiceKey),
      returnType: "json",
      numOfRows: 100,
      pageNo: 1,
      searchDate,
      InformCode: "PM10", // 파라미터와 무관히 전 코드가 오므로 코어에서 재필터
    },
  });
}

/**
 * 전국 대기질 예보(코드·대상일별 최신 발표)를 조회한다.
 * 실패 시 마지막 성공 스냅샷으로 폴백("N분 전 기준"), 없으면 failure. 절대 throw 하지 않는다.
 */
export async function getDustForecast(
  now: Date = new Date(),
): Promise<PartialResult<ParsedDustForecast>> {
  const { today } = getForecastDates(now);
  const { yyyymmdd, slot } = getDustSlot(now);
  const key = dustKey(yyyymmdd, slot);

  return withStaleFallback(key, async () => {
    const raw = await fetchDustForecast(today, yyyymmdd, slot);
    const normalized = normalizeDustForecast(raw, now);
    if (normalized.status === "failure") {
      // producer 계약: 실패는 throw 로 신호. apiError 보존.
      throw Object.assign(new Error(normalized.error.message), { apiError: normalized.error });
    }
    return normalized.data;
  });
}

/**
 * 산의 `region` 기준 오늘·내일 대기질 예보를 조회한다.
 * - 전국 예보 조회 실패/폴백 → 상태 승계(failure/stale)
 * - 예보는 왔지만 이 산의 지역이 예보권역으로 매핑되지 않음 → failure(not_covered): 섹션 미노출
 */
export async function getDustForecastForMountain(
  region: string,
  now: Date = new Date(),
): Promise<PartialResult<DustForecast>> {
  const parsed = await getDustForecast(now);

  if (parsed.status === "failure") return { status: "failure", error: parsed.error };

  const forecast = dustForecastForRegion(parsed.data, region);
  if (!forecast) {
    return {
      status: "failure",
      error: {
        code: "not_covered",
        message: "이 지역의 대기질 예보는 제공되지 않습니다.",
      },
    };
  }

  if (parsed.status === "stale") {
    return { status: "stale", data: forecast, fetchedAt: parsed.fetchedAt, error: parsed.error };
  }
  return { status: "success", data: forecast, fetchedAt: parsed.fetchedAt };
}
