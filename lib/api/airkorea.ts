/**
 * 에어코리아 대기오염정보 연동 — 캐싱·오케스트레이션 (Task 021, 결정 001 #5).
 *
 * 서버 전용. 흐름:
 *  1) 산 WGS84 → TM(EPSG:5181) 변환(`wgs84ToTm`)
 *  2) `getNearbyMsrstnList(tmX, tmY)` 로 최근접 측정소명 + 거리 조회 → 임계값 판정
 *  3) `getMsrstnAcctoRltmMesureDnsty(stationName)` 로 실시간 PM10/PM2.5 조회
 *  4) `AirQuality` 로 정규화, 실패 시 마지막 성공 스냅샷으로 폴백("N분 전 기준")
 *
 * 캐싱: 측정소 매핑은 거의 불변이라 길게(mountains-1d), 실시간 측정값은 1시간(air-1h)
 * 보존한다. 원시 응답만 `'use cache'` 로 캐싱하고 정규화는 순수 코어(airkorea-core.ts)가
 * 담당한다.
 *
 * serviceKey 는 `.env.local` 에 Encoding(URL-인코딩) 형태라 `decodeURIComponent` 로 미리
 * 풀어 넘긴다(fetcher 의 URLSearchParams 가 정확히 한 번만 인코딩 — 날씨와 동일 규칙).
 */

import { cacheLife, cacheTag } from "next/cache";
import type { AirQuality, PartialResult } from "@/lib/types";
import { serverEnv } from "@/lib/env";
import {
  pickNearestStation,
  wgs84ToTm,
  type NearestStationResult,
} from "@/lib/geo/nearest-station";
import { fetchJson } from "./fetcher";
import { withStaleFallback } from "./cache";
import { CACHE_PROFILE, airKey, mountainTag, sourceTag } from "./cache";
import { toApiError } from "./errors";
import { normalizeAirQuality, type RealtimeResponse } from "./airkorea-core";

const NEARBY_STATION_URL =
  "https://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getNearbyMsrstnList";
const REALTIME_URL =
  "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 현재 시각을 KST 로 환산한 YYYYMMDDHH(정시). 실시간 캐시 키·"측정 시간" 버킷용. */
function kstYmdHour(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return (
    `${kst.getUTCFullYear()}${pad2(kst.getUTCMonth() + 1)}${pad2(kst.getUTCDate())}` +
    pad2(kst.getUTCHours())
  );
}

/**
 * 최근접 측정소 목록을 캐싱 조회한다(`'use cache'`, mountains-1d).
 * 매핑은 거의 불변이므로 길게 보존하고, 산 단위 태그로 무효화 가능하게 한다.
 */
async function fetchNearbyStations(mountainId: string, tmX: number, tmY: number): Promise<unknown> {
  "use cache";
  cacheLife(CACHE_PROFILE.mountains);
  cacheTag(mountainTag(mountainId), sourceTag("air"));

  return fetchJson(NEARBY_STATION_URL, {
    // 에어코리아 게이트웨이는 no-store 요청을 거부(503/행)하므로 "default" 로 호출한다.
    cache: "default",
    searchParams: {
      serviceKey: decodeURIComponent(serverEnv.airkoreaServiceKey),
      returnType: "json",
      tmX,
      tmY,
      ver: "1.1",
    },
  });
}

/**
 * 측정소 실시간 측정정보를 캐싱 조회한다(`'use cache'`, air-1h).
 * 캐시 키는 (측정소명, YYYYMMDDHH) 로 결정돼 같은 시간대 재조회를 캐시 히트시킨다.
 */
async function fetchRealtimeMeasurement(
  mountainId: string,
  stationName: string,
  yyyymmddhh: string,
): Promise<RealtimeResponse> {
  "use cache";
  cacheLife(CACHE_PROFILE.air);
  cacheTag(airKey(stationName, yyyymmddhh), mountainTag(mountainId), sourceTag("air"));

  return fetchJson<RealtimeResponse>(REALTIME_URL, {
    // 에어코리아 게이트웨이는 no-store 요청을 거부(503/행)하므로 "default" 로 호출한다.
    cache: "default",
    searchParams: {
      serviceKey: decodeURIComponent(serverEnv.airkoreaServiceKey),
      returnType: "json",
      stationName,
      dataTerm: "DAILY",
      ver: "1.3",
      numOfRows: 1, // 최신 1건이면 충분
      pageNo: 1,
    },
  });
}

/**
 * 산의 위경도로 오늘 대기질(PM10/PM2.5)을 조회한다.
 * - 인근 측정소 없음(거리 임계값 초과·조회 실패) → failure(no_station): 점수 계층이 변수 제외
 * - 측정값 조회 실패 → 마지막 성공 스냅샷으로 폴백("N분 전 기준"), 없으면 failure
 * 절대 throw 하지 않는다(부분 실패 격리).
 */
export async function getAirQuality(
  mountainId: string,
  lat: number,
  lng: number,
  now: Date = new Date(),
): Promise<PartialResult<AirQuality>> {
  const { tmX, tmY } = wgs84ToTm(lat, lng);

  // 1) 최근접 측정소 매핑 (네트워크 실패도 no_station 계열로 격리)
  let nearest: NearestStationResult;
  try {
    const nearbyRaw = await fetchNearbyStations(mountainId, tmX, tmY);
    nearest = pickNearestStation(nearbyRaw);
  } catch (err) {
    return { status: "failure", error: toApiError(err) };
  }
  if (nearest.status !== "success") {
    return nearest; // no_station failure
  }

  const { stationName, distanceKm } = nearest.data;
  const yyyymmddhh = kstYmdHour(now);
  const key = airKey(stationName, yyyymmddhh);

  // 2) 실시간 측정값 조회 + stale 폴백
  return withStaleFallback(key, async () => {
    const raw = await fetchRealtimeMeasurement(mountainId, stationName, yyyymmddhh);
    const normalized = normalizeAirQuality(raw, stationName, distanceKm);
    if (normalized.status === "failure") {
      // producer 계약: 실패는 throw 로 신호. errors.toApiError 가 실린 apiError 보존.
      throw Object.assign(new Error(normalized.error.message), { apiError: normalized.error });
    }
    return normalized.data;
  });
}
