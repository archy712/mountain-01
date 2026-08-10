/**
 * 기상청 단기예보(getVilageFcst) 연동 — 캐싱·오케스트레이션 (Task 016, 결정 001 #3).
 *
 * 서버 전용. `'use cache'` 로 원시 응답을 캐싱하고, 순수 정규화(kma-forecast-core.ts)로
 * 앱 표준 `WeatherSnapshot` 을 만든다. "오늘 이 산에 가도 되는지"를 판단하는 1단계 날씨 소스다.
 *
 * 왜 단기예보(getVilageFcst)인가:
 * - `WeatherSnapshot` 은 TMP·POP·SKY·PTY·WSD·REH 6종을 모두 요구한다.
 * - POP(강수확률)·SKY(하늘상태)·TMP(기온예보)는 **초단기실황(getUltraSrtNcst)에 없고**
 *   단기예보에만 있다. 6종을 한 소스로 채우려면 단기예보가 정답이다.
 * - 결정 001 #3 의 "혼용"은 향후 확장 여지(초단기실황으로 현재값 보정)이며,
 *   1단계 단일 스냅샷은 단기예보로 충분하다.
 *
 * 캐싱: fetcher 는 `cache:"no-store"` 로 매번 원격을 치지만, 이 파일의 `'use cache'`
 * 디렉티브가 그 위에서 결과를 30분(weather-30m) 보존한다(Next 16 규약: no-store 는
 * use-cache 스코프 안에서 재정의됨).
 */

import { cacheLife, cacheTag } from "next/cache";
import type { PartialResult, WeatherForecast, WeatherSnapshot } from "@/lib/types";
import { hasData } from "@/lib/types";
import { serverEnv } from "@/lib/env";
import type { KmaGrid } from "@/lib/geo/kma-grid";
import { fetchJson } from "./fetcher";
import { withStaleFallback } from "./cache";
import { CACHE_PROFILE, mountainTag, sourceTag, weatherKey } from "./cache";
import type { CurrentObservation, NcstResponse, VilageResponse } from "./kma-forecast-core";
import {
  getTargetDateTime,
  getUltraSrtNcstBaseDateTime,
  getVilageBaseDateTime,
  mergeSnapshotWithNcst,
  normalizeUltraSrtNcst,
  normalizeVilageForecast,
  normalizeVilageForecastFull,
} from "./kma-forecast-core";

export {
  getTargetDateTime,
  getVilageBaseDateTime,
  normalizeVilageForecast,
  normalizeVilageForecastFull,
} from "./kma-forecast-core";

const VILAGE_FCST_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const ULTRA_NCST_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";

/**
 * 단기예보 원시 응답을 캐싱 조회한다(`'use cache'`, weather-30m).
 * API 키는 이 함수 내부에서 `serverEnv` 로 읽어 캐시 키에 비밀이 섞이지 않게 한다.
 * 캐시 키는 (mountainId, nx, ny, baseDate, baseTime) 인자로 결정된다.
 */
async function fetchVilageForecast(
  mountainId: string,
  nx: number,
  ny: number,
  baseDate: string,
  baseTime: string,
): Promise<VilageResponse> {
  "use cache";
  cacheLife(CACHE_PROFILE.weather);
  cacheTag(
    weatherKey(mountainId, baseDate, baseTime),
    mountainTag(mountainId),
    sourceTag("weather"),
  );

  return fetchJson<VilageResponse>(VILAGE_FCST_URL, {
    searchParams: {
      // 공공데이터포털 키는 .env.local 에 **Encoding(URL-인코딩)** 형태로 저장돼 있다.
      // fetcher 의 searchParams 는 URLSearchParams 로 값을 한 번 인코딩하므로, 그대로
      // 넘기면 `%` 가 이중 인코딩돼 "등록되지 않은 서비스키(코드30)"가 난다.
      // 미리 디코딩해 넘겨 정확히 한 번만 인코딩되게 한다(에어코리아·자외선도 동일 규칙).
      serviceKey: decodeURIComponent(serverEnv.kmaServiceKey),
      pageNo: 1,
      numOfRows: 1000, // 하루치 전 카테고리 확보
      dataType: "JSON",
      base_date: baseDate,
      base_time: baseTime,
      nx,
      ny,
    },
  });
}

/**
 * 초단기실황 원시 응답을 캐싱 조회한다(`'use cache'`, weather-30m).
 * 캐시 키는 단기예보와 섞이지 않도록 `:ncst` 접미사를 붙인다(접두사는 "weather" 유지 →
 * api_logs 계측에서 weather 소스로 집계). 매시각 발표라 baseTime 이 바뀌면 캐시가 갱신된다.
 */
async function fetchUltraSrtNcst(
  mountainId: string,
  nx: number,
  ny: number,
  baseDate: string,
  baseTime: string,
): Promise<NcstResponse> {
  "use cache";
  cacheLife(CACHE_PROFILE.weather);
  cacheTag(
    `${weatherKey(mountainId, baseDate, baseTime)}:ncst`,
    mountainTag(mountainId),
    sourceTag("weather"),
  );

  return fetchJson<NcstResponse>(ULTRA_NCST_URL, {
    searchParams: {
      serviceKey: decodeURIComponent(serverEnv.kmaServiceKey),
      pageNo: 1,
      numOfRows: 100,
      dataType: "JSON",
      base_date: baseDate,
      base_time: baseTime,
      nx,
      ny,
    },
  });
}

/**
 * 초단기실황(실측) 현재 관측값을 조회한다(best-effort). 실패는 격리해 null 을 반환하므로,
 * 호출부는 단기예보 스냅샷을 그대로 유지(보정 생략)할 수 있다. 자체 stale 폴백·계측을 가진다.
 */
async function fetchNcstObservation(
  mountainId: string,
  grid: KmaGrid,
  now: Date,
): Promise<CurrentObservation | null> {
  const { baseDate, baseTime } = getUltraSrtNcstBaseDateTime(now);
  const key = `${weatherKey(mountainId, baseDate, baseTime)}:ncst`;

  const result = await withStaleFallback(key, async () => {
    const raw = await fetchUltraSrtNcst(mountainId, grid.nx, grid.ny, baseDate, baseTime);
    const obs = normalizeUltraSrtNcst(raw);
    if (obs.status === "failure") {
      throw Object.assign(new Error(obs.error.message), { apiError: obs.error });
    }
    return obs.data;
  });

  return hasData(result) ? result.data : null;
}

/**
 * 산의 격자 좌표로 오늘 날씨 스냅샷을 조회한다.
 * 단기예보로 6종을 채운 뒤, **초단기실황(실측)으로 "지금" 값(기온·습도·풍속·강수형태)을
 * 보정**한다(Task 051). 초단기실황 실패는 격리(단기예보 단독 유지). 단기예보 실패 시
 * 마지막 성공 스냅샷으로 폴백("N분 전 기준"), 없으면 failure.
 */
export async function getWeatherSnapshot(
  mountainId: string,
  grid: KmaGrid,
  now: Date = new Date(),
): Promise<PartialResult<WeatherSnapshot>> {
  const { baseDate, baseTime } = getVilageBaseDateTime(now);
  const target = getTargetDateTime(now);
  const key = weatherKey(mountainId, baseDate, baseTime);

  const forecast = await withStaleFallback(key, async () => {
    const raw = await fetchVilageForecast(mountainId, grid.nx, grid.ny, baseDate, baseTime);
    const normalized = normalizeVilageForecast(raw, target.date, target.time);
    if (normalized.status === "failure") {
      // producer 계약: 실패는 throw 로 신호(withStaleFallback 가 stale/failure 판정).
      // errors.toApiError 가 실린 apiError 를 보존한다.
      throw Object.assign(new Error(normalized.error.message), { apiError: normalized.error });
    }
    return normalized.data;
  });

  if (!hasData(forecast)) return forecast;

  // 초단기실황으로 현재값 보정(실패 시 단기예보 스냅샷 유지). 신선도 상태는 단기예보 기준 유지.
  const obs = await fetchNcstObservation(mountainId, grid, now);
  const data = obs ? mergeSnapshotWithNcst(forecast.data, obs) : forecast.data;
  return { ...forecast, data };
}

/**
 * 산의 격자 좌표로 확장 예보(현재 + 시간대별 + 3일)를 조회한다(Task 034).
 * `getWeatherSnapshot` 과 **동일한 캐시된 원시 응답**을 재사용하므로 추가 네트워크가 없다.
 * 스냅샷과 stale 폴백 슬롯이 섞이지 않도록 캐시 키에 `:forecast` 접미사를 붙인다.
 */
export async function getWeatherForecast(
  mountainId: string,
  grid: KmaGrid,
  now: Date = new Date(),
): Promise<PartialResult<WeatherForecast>> {
  const { baseDate, baseTime } = getVilageBaseDateTime(now);
  const target = getTargetDateTime(now);
  const key = `${weatherKey(mountainId, baseDate, baseTime)}:forecast`;

  const forecast = await withStaleFallback(key, async () => {
    const raw = await fetchVilageForecast(mountainId, grid.nx, grid.ny, baseDate, baseTime);
    const normalized = normalizeVilageForecastFull(raw, target.date, target.time);
    if (normalized.status === "failure") {
      throw Object.assign(new Error(normalized.error.message), { apiError: normalized.error });
    }
    return normalized.data;
  });

  if (!hasData(forecast)) return forecast;

  // 현재 스냅샷만 초단기실황으로 보정한다(시간대별/3일 예보는 단기예보 유지).
  // getWeatherSnapshot 과 동일한 ncst 캐시 키라 추가 네트워크 없이 캐시 히트로 재사용된다.
  const obs = await fetchNcstObservation(mountainId, grid, now);
  const data = obs
    ? { ...forecast.data, current: mergeSnapshotWithNcst(forecast.data.current, obs) }
    : forecast.data;
  return { ...forecast, data };
}
