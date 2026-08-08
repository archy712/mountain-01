/**
 * 더미 데이터 배럴 (Phase 2 UI 전용, Task 008). `@/lib/mock` 으로 일괄 import.
 *
 * `getMockMountainDetail` 은 개별 mock 을 Task 006 표준 집계 스키마
 * (`MountainDetailData`)로 조합한다. 소스별 `PartialResult` 로 감싸 부분 실패
 * (예: 한라산 대기질 측정소 없음)를 그대로 재현하므로 상세 화면(Task 010·011)의
 * 성공/부분실패/정보없음 UI 를 더미만으로 검증할 수 있다.
 */

import type { ApiError, MountainDetailData, PartialResult } from "@/lib/types";

import { getMountainById, getTrailsByMountainId } from "./mountains";
import { getMockWeather } from "./weather";
import { getMockAir, getMockCondition, getMockGear, getMockUv } from "./condition";

export * from "./mountains";
export * from "./weather";
export * from "./condition";

const NO_STATION_ERROR: ApiError = {
  code: "no_station",
  message: "인근 측정소가 없어 대기질 정보를 제공하지 못했어요.",
};

function ok<T>(data: T): PartialResult<T> {
  return { status: "success", data, fetchedAt: new Date().toISOString() };
}

/**
 * 산 id 로 상세 집계 더미를 조합한다. 없는 산이면 `undefined`.
 * 대기질이 없는 산은 `failure` 로 표현해 부분 실패 UI 를 유도한다.
 */
export function getMockMountainDetail(id: string): MountainDetailData | undefined {
  const mountain = getMountainById(id);
  if (!mountain) return undefined;

  const weather = getMockWeather(id);
  const air = getMockAir(id);
  const uv = getMockUv(id);
  const condition = getMockCondition(id);

  return {
    mountain,
    weather: weather
      ? ok(weather)
      : {
          status: "failure",
          error: { code: "upstream_error", message: "날씨 정보를 불러오지 못했어요." },
        },
    trails: ok(getTrailsByMountainId(id)),
    air: air ? ok(air) : { status: "failure", error: NO_STATION_ERROR },
    uv: uv ? ok(uv) : undefined,
    condition: condition ? ok(condition) : undefined,
    gear: getMockGear(id),
  };
}
