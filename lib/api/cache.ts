/**
 * 외부 API 캐싱 레이어 (Task 015, 결정 003 #8·#9).
 *
 * 두 가지를 제공한다.
 *  1) **cacheLife 프로필명 + 캐시 키/태그 빌더** — 소스 모듈(Task 016·017·021·022)이
 *     `'use cache'` 함수 안에서 `cacheLife(CACHE_PROFILE.weather)` / `cacheTag(...)` 로 쓴다.
 *     프로필 자체(TTL 초)는 next.config.ts 의 `cacheLife` 에 정의돼 있고, 아래 상수와
 *     **반드시 동기화**한다(단일 출처: 결정 003 캐시 키·TTL 표).
 *  2) **withStaleFallback** — 신선 조회 실패 시 마지막 성공 스냅샷을 `PartialResult.stale`
 *     (+`fetchedAt`)로 반환해 "N분 전 기준" 라벨을 지원한다.
 *
 * 역할 경계: 신선도(TTL) 내 캐싱은 Next `"use cache"` 가, "가공 결과(점수)의 영속"은
 * `condition_scores` 테이블이 담당한다(결정 003 #9). 이 파일은 원천 응답 캐싱 보조다.
 */

import type { ApiError, PartialResult } from "@/lib/types";
import { toApiError } from "./errors";
import { deriveSource, recordApiCall } from "./metrics";

/**
 * next.config.ts `cacheLife` 에 정의된 커스텀 프로필명.
 * 값(TTL 초)은 결정 003 표 기준이며 next.config 와 동기화해야 한다.
 */
export const CACHE_PROFILE = {
  /** 날씨(당일 D-0): 초단기실황/예보, revalidate 30분 */
  weather: "weather-30m",
  /** 날씨(익일↑): 단기예보, revalidate 3시간 */
  vilage: "vilage-3h",
  /** 대기질(에어코리아): revalidate 1시간 */
  air: "air-1h",
  /** 대기질 예보통보(에어코리아, 하루 4회 발표): revalidate 6시간 (Task 052) */
  dust: "dust-6h",
  /** 자외선(생활기상지수 V5): revalidate 3시간 */
  uv: "uv-3h",
  /** 탐방로(정적 CSV + 오늘 통제 계산): revalidate 6시간 */
  trails: "trails-6h",
  /** 산불위험예보(산림청, 3시간 간격 발표): revalidate 3시간 (Task 043) */
  fire: "fire-3h",
  /** 산 마스터 목록(거의 불변, Task 018): revalidate 1일 */
  mountains: "mountains-1d",
  /** 인기 산/검색 로그 집계(Task 018): revalidate 1시간 */
  search: "search-1h",
} as const;

export type CacheProfileName = (typeof CACHE_PROFILE)[keyof typeof CACHE_PROFILE];

/**
 * 프로필별 TTL(초). next.config.ts 의 revalidate 값과 동일해야 한다(문서·검증용 단일 출처).
 */
export const CACHE_TTL_SECONDS: Record<CacheProfileName, number> = {
  "weather-30m": 30 * 60,
  "vilage-3h": 3 * 60 * 60,
  "air-1h": 60 * 60,
  "dust-6h": 6 * 60 * 60,
  "uv-3h": 3 * 60 * 60,
  "trails-6h": 6 * 60 * 60,
  "fire-3h": 3 * 60 * 60,
  "mountains-1d": 24 * 60 * 60,
  "search-1h": 60 * 60,
};

// ── 캐시 키 빌더 (결정 003 캐시 키 표) ──────────────────────────────

/** `weather:{mountainId}:{base_date}:{base_time}` */
export function weatherKey(mountainId: string, baseDate: string, baseTime: string): string {
  return `weather:${mountainId}:${baseDate}:${baseTime}`;
}

/** `vilage:{mountainId}:{base_date}:{base_time}` */
export function vilageKey(mountainId: string, baseDate: string, baseTime: string): string {
  return `vilage:${mountainId}:${baseDate}:${baseTime}`;
}

/** `air:{stationName}:{yyyyMMddHH}` */
export function airKey(stationName: string, yyyymmddhh: string): string {
  return `air:${stationName}:${yyyymmddhh}`;
}

/** `uv:{areaNo}:{yyyyMMddHH}` */
export function uvKey(areaNo: string, yyyymmddhh: string): string {
  return `uv:${areaNo}:${yyyymmddhh}`;
}

/**
 * `dust:{yyyyMMdd}:{slot}` — 대기질 예보통보(전국) 스냅샷 캐시 키.
 * 예보통보는 1회 호출로 전 권역이 모두 오므로 산별 키가 아니라 발표 슬롯 단위로만 캐싱한다.
 * slot 은 하루 4회 발표시각(05·11·17·23)에 정렬해 새 발표를 즉시 반영한다.
 */
export function dustKey(yyyymmdd: string, slot: string): string {
  return `dust:${yyyymmdd}:${slot}`;
}

/** `trails:{mountainId}:{yyyyMMdd}` */
export function trailsKey(mountainId: string, yyyymmdd: string): string {
  return `trails:${mountainId}:${yyyymmdd}`;
}

/**
 * `fire:sido:{yyyyMMdd}:{slot}` — 산불위험(시도) 스냅샷 캐시 키.
 * 시도 1회 호출로 전국 16개 시도가 모두 오므로 산별 키가 아니라 발표 슬롯 단위로만 캐싱한다.
 * slot 은 3시간 단위(발표주기)로 정렬해 TTL(fire-3h)과 맞춘다.
 */
export function fireKey(yyyymmdd: string, slot: string): string {
  return `fire:sido:${yyyymmdd}:${slot}`;
}

// ── 캐시 태그 빌더 (revalidateTag 무효화용) ─────────────────────────

/** 산 단위 무효화 태그. */
export function mountainTag(mountainId: string): string {
  return `mountain:${mountainId}`;
}

/** 소스 단위 무효화 태그(예: 전체 날씨 강제 갱신). */
export function sourceTag(source: keyof typeof CACHE_PROFILE): string {
  return `source:${source}`;
}

// ── stale 폴백 (마지막 성공 응답 보존) ──────────────────────────────

interface Snapshot<T> {
  data: T;
  /** 마지막 성공 시각(ISO). "N분 전 기준" 라벨 계산에 사용. */
  fetchedAt: string;
}

/**
 * 마지막 성공 스냅샷 저장소.
 * 프로세스 로컬(Fluid compute 인스턴스별)이라 "완전한 지속성"은 아니다. TTL 내 지속성은
 * Next `"use cache"` 가 담당하고, 이 버퍼는 신선 조회가 실패했을 때 명시적 `stale` 형태
 * (data+fetchedAt+error)를 만들어 UI 라벨을 지원하는 보조 장치다.
 * 키 수는 (소스×산)으로 제한적이라 메모리 부담은 작다.
 */
const lastGood = new Map<string, Snapshot<unknown>>();

export interface StaleFallbackResult<T> {
  result: PartialResult<T>;
  /** 이번 호출이 신선 조회를 실제로 수행했는지(캐시/스냅샷 관찰용). */
  fromFresh: boolean;
}

/**
 * `producer` 로 신선 데이터를 조회하고, 실패 시 마지막 성공 스냅샷으로 폴백한다.
 *
 * - 성공: 스냅샷 갱신 후 `{ status:"success", data, fetchedAt:now }`
 * - 실패 + 스냅샷 있음: `{ status:"stale", data, fetchedAt:<마지막 성공>, error }`
 * - 실패 + 스냅샷 없음: `{ status:"failure", error }`
 *
 * `producer` 는 성공 시 데이터를 반환하고 실패 시 throw 한다(fetcher 계약).
 * 절대 다시 throw 하지 않는다(부분 실패 격리).
 *
 * @param key   소스+대상 식별 캐시 키(예: weatherKey(...))
 * @param producer 신선 데이터 조회 함수(성공: T 반환 / 실패: throw)
 */
export async function withStaleFallback<T>(
  key: string,
  producer: () => Promise<T>,
): Promise<PartialResult<T>> {
  // 요청 관찰 지연·결과 상태를 api_logs 에 계측한다(Task 035, fire-and-forget).
  // 소스는 키 접두사에서 파생하며, 매핑되지 않는 키(계측 대상 외)면 기록을 건너뛴다.
  const source = deriveSource(key);
  const startedAt = Date.now();

  try {
    const data = await producer();
    const fetchedAt = new Date().toISOString();
    lastGood.set(key, { data, fetchedAt });
    if (source) recordApiCall({ source, status: "success", latencyMs: Date.now() - startedAt });
    return { status: "success", data, fetchedAt };
  } catch (err) {
    const error: ApiError = toApiError(err);
    const snapshot = lastGood.get(key) as Snapshot<T> | undefined;
    if (snapshot) {
      if (source)
        recordApiCall({
          source,
          status: "stale",
          latencyMs: Date.now() - startedAt,
          errorKind: error.code,
        });
      return {
        status: "stale",
        data: snapshot.data,
        fetchedAt: snapshot.fetchedAt,
        error,
      };
    }
    if (source)
      recordApiCall({
        source,
        status: "failure",
        latencyMs: Date.now() - startedAt,
        errorKind: error.code,
      });
    return { status: "failure", error };
  }
}

/** 테스트·강제 무효화용: stale 스냅샷 버퍼를 비운다. */
export function __clearStaleBuffer(): void {
  lastGood.clear();
}
