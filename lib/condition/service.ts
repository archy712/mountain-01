/**
 * 컨디션 점수 오케스트레이터 (Task 023, 서버 전용).
 *
 * 날씨·대기질·자외선 세 소스를 병렬 조회하고, 서버 순수 엔진(`computeConditionScore`)으로
 * 점수를 산출한다. 소스별 부분 실패는 격리한다:
 *  - 날씨 실패 → 점수 계산 불가(핵심 변수). PartialResult.failure 반환.
 *  - 대기질/자외선 실패 → 해당 변수만 감점 후보에서 제외(excludedVariables), 나머지로 계산.
 *  - 날씨가 stale(마지막 성공 캐시)면 계산은 하되 결과도 stale 로 표시("N분 전 기준").
 *
 * 계산 결과는 `condition_scores` 에 append 저장하되, 동일 버전의 신선한 행이 이미 있으면
 * 쓰기를 생략해 행 폭증을 막는다(결정 003 #9). 저장은 서비스 롤 키가 있을 때만 수행된다.
 */

import type { ConditionBundle, HourlyConditionTrend, PartialResult, Trail } from "@/lib/types";
import { hasData } from "@/lib/types";
import { getWeatherForecast, getWeatherSnapshot } from "@/lib/api/kma-forecast";
import { getAirQuality } from "@/lib/api/airkorea";
import { getUvIndex } from "@/lib/api/kma-uv";
import { getFireRiskForMountain } from "@/lib/api/forest-fire";
import { getTrailsForMountain } from "@/lib/data/mountain-detail";
import { getSunTimesToday } from "@/lib/geo/sun-times";
import { assessConditionFactors, computeConditionScore } from "./score";
import { computeHourlyConditionTrend, type DaylightInput } from "./hourly";
import { recommendGear } from "./gear-rules";
import { readCachedScore, writeScore } from "./cache";

/** 오케스트레이션에 필요한 산 좌표/식별 정보(라우트가 DB 에서 조회해 전달). */
export interface ConditionMountainInput {
  id: string;
  gridNx: number;
  gridNy: number;
  lat: number;
  lng: number;
  /** 행정 지역(시도 단위, 산불위험 조회용, Task 043) */
  region: string;
}

/**
 * 산의 실시간 컨디션 점수 + 장비 추천을 산출한다. 날씨가 사용 불가면 failure, 그 외에는
 * success/stale. 점수와 장비는 동일 입력으로 함께 계산돼 소스 조회를 한 번만 수행한다.
 * @param now 계산 시각 주입(테스트 결정성). 기본 now.
 */
export async function getConditionForMountain(
  mountain: ConditionMountainInput,
  now: Date = new Date(),
): Promise<PartialResult<ConditionBundle>> {
  const [weatherResult, airResult, uvResult, fireResult] = await Promise.all([
    getWeatherSnapshot(mountain.id, { nx: mountain.gridNx, ny: mountain.gridNy }, now),
    getAirQuality(mountain.id, mountain.lat, mountain.lng, now),
    getUvIndex(mountain.id, now),
    getFireRiskForMountain(mountain.region, now),
  ]);

  // 날씨는 핵심 입력 — 사용 가능한 데이터가 없으면 점수를 낼 수 없다.
  if (!hasData(weatherResult)) {
    return { status: "failure", error: weatherResult.error };
  }

  const air = hasData(airResult) ? airResult.data : null;
  const uv = hasData(uvResult) ? uvResult.data : null;
  const fire = hasData(fireResult) ? fireResult.data : null;

  const score = computeConditionScore({ weather: weatherResult.data, air, uv, fire, now });
  const gear = recommendGear({ weather: weatherResult.data, air, uv });
  // 좋은 요인까지 포함한 전체 요인 평가(점수 근거 UI 용). 엔진과 동일 감점 로직 재사용.
  const factors = assessConditionFactors({ weather: weatherResult.data, air, uv, fire });
  // air/uv/fire 원값도 함께 반환해 상세 화면이 감점 근거를 실제 수치로 노출하게 한다(Task 034·043).
  const bundle: ConditionBundle = { score, gear, air, uv, fire, factors };

  // 신선한 캐시 행이 없을 때만 저장(행 폭증 방지 + "조회" 경로 겸용).
  const existing = await readCachedScore(mountain.id);
  if (existing === null) {
    await writeScore(mountain.id, score);
  }

  // 날씨가 stale 이면 결과 신선도도 stale 로 승계("N분 전 기준" 라벨).
  if (weatherResult.status === "stale") {
    return {
      status: "stale",
      data: bundle,
      fetchedAt: weatherResult.fetchedAt,
      error: weatherResult.error,
    };
  }

  return { status: "success", data: bundle, fetchedAt: weatherResult.fetchedAt };
}

/**
 * 산의 오늘 시간대별 컨디션 추이("언제 가면 좋은지")를 산출한다(Task 039).
 *
 * 확장 예보(시간별)와 대기질·자외선 스냅샷을 병렬 조회한다. 세 소스 모두
 * `getConditionForMountain` 과 **동일한 캐시 키**를 쓰므로(같은 요청에서 이미 채워짐)
 * 추가 네트워크 없이 캐시 히트로 재사용된다. 예보가 없으면 추이를 낼 수 없어 failure,
 * 대기질/자외선 결측은 감점 후보에서 제외될 뿐 추이 자체는 유지된다. 점수 저장(DB)은
 * 하지 않는다(파생 뷰라 `getConditionForMountain` 의 캐시 행으로 충분).
 * @param now 계산 시각 주입(테스트 결정성). 기본 now.
 */
export async function getConditionTrendForMountain(
  mountain: ConditionMountainInput,
  now: Date = new Date(),
): Promise<PartialResult<HourlyConditionTrend>> {
  const [forecastResult, airResult, uvResult, trailsResult] = await Promise.all([
    getWeatherForecast(mountain.id, { nx: mountain.gridNx, ny: mountain.gridNy }, now),
    getAirQuality(mountain.id, mountain.lat, mountain.lng, now),
    getUvIndex(mountain.id, now),
    getTrailsForMountain(mountain.id, now),
  ]);

  // 예보는 추이의 핵심 입력 — 사용 가능한 데이터가 없으면 추이를 낼 수 없다.
  if (!hasData(forecastResult)) {
    return { status: "failure", error: forecastResult.error };
  }

  const air = hasData(airResult) ? airResult.data : null;
  const uv = hasData(uvResult) ? uvResult.data : null;
  // 안전 출발(일몰) 입력: 긴 코스 왕복 + 오늘 일몰. 코스 소요시간이 없으면 undefined(제약 없음).
  const daylight = buildDaylightInput(mountain, trailsResult, now);
  const trend = computeHourlyConditionTrend({ forecast: forecastResult.data, air, uv, daylight });

  // 예보가 stale 이면 추이 신선도도 stale 로 승계.
  if (forecastResult.status === "stale") {
    return {
      status: "stale",
      data: trend,
      fetchedAt: forecastResult.fetchedAt,
      error: forecastResult.error,
    };
  }

  return { status: "success", data: trend, fetchedAt: forecastResult.fetchedAt };
}

/** 개방 코스 1건의 왕복 소요(분). 오는시간 결측 시 오름의 0.8배로 근사. 소요 미상이면 null. */
function trailRoundTripMin(t: Trail): number | null {
  if (t.goMinutes == null || t.goMinutes <= 0) return null;
  const come =
    t.comeMinutes != null && t.comeMinutes > 0 ? t.comeMinutes : Math.round(t.goMinutes * 0.8);
  return t.goMinutes + come;
}

/** 오름차순 배열의 p분위(nearest-rank). 빈 배열이면 0. */
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.ceil(p * sortedAsc.length);
  return sortedAsc[Math.min(sortedAsc.length - 1, Math.max(0, rank - 1))];
}

/**
 * 코스 소요시간을 모르는 산(국립공원 외 등 탐방로 미보유)의 보수적 기본 왕복 소요(분).
 * 일반적인 반나절 산행(왕복 ~2시간)을 가정한다. 이 값이 없으면 일몰 가드가 아예 꺼져
 * 저녁이 시원해 점수가 높다는 이유로 **일몰 후 출발**을 추천하는 문제가 생긴다(청계산 등).
 * 안전 방향(과소추정 금지)으로 잡되, 향후 큐레이션 소스로 산별 정밀화 여지가 있다.
 */
const DEFAULT_ROUND_TRIP_MIN = 120;

/**
 * 안전 출발(일몰) 입력을 만든다. 참조 왕복시간은 **개방 코스 왕복시간의 상위 80퍼센타일**로
 * 잡아, 초장거리 종주 1개(예: 북한산 13km 종주)가 오후 전체를 "너무 늦음"으로 만드는 왜곡을
 * 피한다(전 코스가 장거리인 한라산은 사실상 최장에 수렴). **코스 소요시간이 없으면 기본
 * 추정치(`DEFAULT_ROUND_TRIP_MIN`)로 대체**해 일몰 가드를 유지한다(estimated=true). 일몰
 * 자체를 구할 수 없을 때만 undefined(가드 없음).
 */
function buildDaylightInput(
  mountain: ConditionMountainInput,
  trailsResult: PartialResult<Trail[]>,
  now: Date,
): DaylightInput | undefined {
  // 개방 코스 왕복시간 상위 80퍼센타일. 코스 데이터가 없거나 소요시간이 전무하면 기본 추정치.
  let roundTripMin = DEFAULT_ROUND_TRIP_MIN;
  let estimated = true;
  if (hasData(trailsResult)) {
    const roundTrips = trailsResult.data
      .filter((t) => t.status !== "closed" && t.status !== "unknown")
      .map(trailRoundTripMin)
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    const p80 = percentile(roundTrips, 0.8);
    if (p80 > 0) {
      roundTripMin = p80;
      estimated = false;
    }
  }

  const { sunrise, sunset } = getSunTimesToday(mountain.lat, mountain.lng, now);
  // 일몰(상한)·일출(하한) 둘 다 있어야 안전 창을 세운다. 하나라도 없으면 가드 없음.
  if (!sunset || !sunrise) return undefined;
  const [sh, sm] = sunset.split(":").map(Number);
  const [rh, rm] = sunrise.split(":").map(Number);

  return {
    roundTripMin,
    sunriseMinutes: rh * 60 + rm,
    sunsetMinutes: sh * 60 + sm,
    estimated,
  };
}
