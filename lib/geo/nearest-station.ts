/**
 * 산 위경도 → 최근접 대기측정소 매핑 (Task 021, 결정 001 #5).
 *
 * 에어코리아 측정소정보 서비스(`MsrstnInfoInqireSvc/getNearbyMsrstnList`)는 **TM 좌표**
 * (tmX/tmY)를 입력으로 받아 근접 측정소를 거리(km)와 함께 반환한다. 산 좌표는 WGS84
 * 위경도라 먼저 TM 으로 변환해야 한다.
 *
 * 이 파일은 두 가지 순수 로직을 제공한다(네트워크 무의존 → 단위 검증 가능).
 *  1) `wgs84ToTm` — WGS84 → TM 중부원점(EPSG:5181, Korea 2000 / Central Belt) 정변환
 *  2) `pickNearestStation` — getNearbyMsrstnList 응답에서 최근접 1개 선택 + 거리 임계값 판정
 *
 * 실제 API 호출·캐싱은 `lib/api/airkorea.ts` 가 담당한다.
 */

import type { ApiError } from "@/lib/types";
import { apiError } from "@/lib/api/errors";

/**
 * 최근접 측정소 유효 거리 임계값(km). 초과 시 "인근 측정소 없음"(no_station)으로 처리하고
 * 컨디션 점수에서 해당 변수를 제외한다(결정 001 #5, 초안 20km).
 */
export const NEAREST_STATION_THRESHOLD_KM = 20;

// ── WGS84 → TM 중부원점(EPSG:5181) ──────────────────────────────────
//
// 에어코리아 TM 좌표계 = Korea 2000 / Central Belt(EPSG:5181).
//  - 타원체: GRS80 (a=6378137, 1/f=298.257222101)
//  - 투영: Transverse Mercator, 중앙자오선 127°E, 원점위도 38°N
//  - 축척계수 k0=1.0, false easting 200000, false northing 500000
// 표준 Transverse Mercator 정변환식(USGS/Redfearn)을 그대로 옮긴 것이다.

const A = 6378137.0; // GRS80 장반경(m)
const F = 1 / 298.257222101; // GRS80 편평률
const K0 = 1.0; // 축척계수
const LAT0 = 38.0; // 원점위도(degree)
const LON0 = 127.0; // 중앙자오선(degree, 중부원점)
const FE = 200000.0; // false easting(m)
const FN = 500000.0; // false northing(m)

const DEG2RAD = Math.PI / 180.0;

export interface TmCoord {
  /** TM X(동쪽, m) — 에어코리아 tmX */
  tmX: number;
  /** TM Y(북쪽, m) — 에어코리아 tmY */
  tmY: number;
}

/** 자오선 호장(M): 적도에서 위도 φ 까지의 자오선 길이(m). */
function meridianArc(latRad: number, e2: number): number {
  return (
    A *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * latRad -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) * Math.sin(2 * latRad) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) * Math.sin(4 * latRad) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * latRad))
  );
}

/**
 * WGS84 위경도 → TM 중부원점(EPSG:5181) 정변환.
 * 반환 tmX/tmY 를 그대로 `getNearbyMsrstnList` 의 tmX/tmY 로 넘긴다.
 */
export function wgs84ToTm(lat: number, lng: number): TmCoord {
  const e2 = F * (2 - F); // 제1이심률 제곱
  const ep2 = e2 / (1 - e2); // 제2이심률 제곱

  const lat0 = LAT0 * DEG2RAD;
  const lon0 = LON0 * DEG2RAD;
  const phi = lat * DEG2RAD;
  const lam = lng * DEG2RAD;

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const N = A / Math.sqrt(1 - e2 * sinPhi * sinPhi); // 묘유선 곡률반경
  const T = tanPhi * tanPhi;
  const C = ep2 * cosPhi * cosPhi;
  const Aa = (lam - lon0) * cosPhi;

  const M = meridianArc(phi, e2);
  const M0 = meridianArc(lat0, e2);

  const tmX =
    FE +
    K0 *
      N *
      (Aa +
        ((1 - T + C) * Math.pow(Aa, 3)) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * Math.pow(Aa, 5)) / 120);

  const tmY =
    FN +
    K0 *
      (M -
        M0 +
        N *
          tanPhi *
          ((Aa * Aa) / 2 +
            ((5 - T + 9 * C + 4 * C * C) * Math.pow(Aa, 4)) / 24 +
            ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * Math.pow(Aa, 6)) / 720));

  return { tmX, tmY };
}

// ── getNearbyMsrstnList 응답 파싱 ───────────────────────────────────

/** 근접측정소 1개(파싱 결과). */
export interface NearestStation {
  stationName: string;
  /** 산 ↔ 측정소 거리(km) */
  distanceKm: number;
}

/**
 * 최근접 측정소 선택 결과. stale 이 없는 단순 성공/실패 판정이라 `PartialResult` 대신
 * 전용 타입을 쓴다(호출부에서 AirQuality 결과로 그대로 전파해도 타입 충돌 없음).
 */
export type NearestStationResult =
  { status: "success"; data: NearestStation } | { status: "failure"; error: ApiError };

interface NearbyItem {
  /** 거리(km) — getNearbyMsrstnList 는 tm 필드로 거리를 반환한다. */
  tm?: number | string;
  stationName?: string;
  addr?: string;
}

interface NearbyResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: NearbyItem[] };
  };
}

/**
 * getNearbyMsrstnList 응답에서 **가장 가까운** 측정소를 고르고 거리 임계값을 적용한다.
 * - 응답 오류/빈 목록 → failure(no_station)
 * - 최근접 거리 > 임계값 → failure(no_station)
 * - 그 외 → success(NearestStation)
 *
 * API 는 tm(거리) 오름차순으로 반환하지만, 방어적으로 최소 tm 을 직접 선택한다.
 */
export function pickNearestStation(
  raw: unknown,
  thresholdKm: number = NEAREST_STATION_THRESHOLD_KM,
): NearestStationResult {
  const res = raw as NearbyResponse;
  const code = res?.response?.header?.resultCode;
  if (code !== undefined && code !== "00") {
    const msg = res?.response?.header?.resultMsg;
    return {
      status: "failure",
      error: apiError("upstream_error", msg ? `측정소 조회 오류: ${msg}` : undefined),
    };
  }

  const items = res?.response?.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return { status: "failure", error: apiError("no_station") };
  }

  let best: NearestStation | undefined;
  for (const it of items) {
    const name = it.stationName?.trim();
    const dist = Number(it.tm);
    if (!name || Number.isNaN(dist)) continue;
    if (!best || dist < best.distanceKm) {
      best = { stationName: name, distanceKm: dist };
    }
  }

  if (!best) {
    return { status: "failure", error: apiError("no_station") };
  }
  if (best.distanceKm > thresholdKm) {
    return { status: "failure", error: apiError("no_station") };
  }

  return { status: "success", data: best };
}
