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

import type { ConditionBundle, PartialResult } from "@/lib/types";
import { hasData } from "@/lib/types";
import { getWeatherSnapshot } from "@/lib/api/kma-forecast";
import { getAirQuality } from "@/lib/api/airkorea";
import { getUvIndex } from "@/lib/api/kma-uv";
import { computeConditionScore } from "./score";
import { recommendGear } from "./gear-rules";
import { readCachedScore, writeScore } from "./cache";

/** 오케스트레이션에 필요한 산 좌표/식별 정보(라우트가 DB 에서 조회해 전달). */
export interface ConditionMountainInput {
  id: string;
  gridNx: number;
  gridNy: number;
  lat: number;
  lng: number;
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
  const [weatherResult, airResult, uvResult] = await Promise.all([
    getWeatherSnapshot(mountain.id, { nx: mountain.gridNx, ny: mountain.gridNy }, now),
    getAirQuality(mountain.id, mountain.lat, mountain.lng, now),
    getUvIndex(mountain.id, now),
  ]);

  // 날씨는 핵심 입력 — 사용 가능한 데이터가 없으면 점수를 낼 수 없다.
  if (!hasData(weatherResult)) {
    return { status: "failure", error: weatherResult.error };
  }

  const air = hasData(airResult) ? airResult.data : null;
  const uv = hasData(uvResult) ? uvResult.data : null;

  const score = computeConditionScore({ weather: weatherResult.data, air, uv, now });
  const gear = recommendGear({ weather: weatherResult.data, air, uv });
  const bundle: ConditionBundle = { score, gear };

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
