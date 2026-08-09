/**
 * 외부 API 호출 계측 (Task 035, 서버 전용).
 *
 * `withStaleFallback`(cache.ts)이 소스별 호출 결과(성공/폴백/실패)와 요청 관찰 지연을
 * 이 모듈로 넘겨 `api_logs` 테이블에 **fire-and-forget** 로 적재한다. 성공률·응답시간
 * 모니터링(목표 95→98%)의 원천 데이터가 된다.
 *
 * 설계 원칙:
 * - 계측 실패가 사용자 흐름·데이터 조회를 절대 막지 않는다(await 하지 않고, 에러는 삼킨다).
 * - insert-only RLS(`api_logs_public_insert`)라 anon 클라이언트로 write 한다(search_logs 관례).
 * - 지연(latencyMs)은 "요청 관찰 시간"이다. `'use cache'` 히트 시 near-zero 이므로 절대적
 *   네트워크 지연이 아니라 **효과 지연**으로 해석한다. 성공/폴백/실패 분포는 캐시와 무관하게
 *   정확하므로 성공률 지표의 근거로 유효하다.
 */

import { createPublicClient } from "@/lib/supabase/public";

/** 외부 소스 식별자. api_logs.source CHECK 제약과 일치해야 한다. */
export type ApiSource = "weather" | "vilage" | "air" | "uv" | "trails";

/** api_logs.status. PartialResult 상태와 1:1. */
export type ApiCallStatus = "success" | "stale" | "failure";

export interface ApiCallRecord {
  source: ApiSource;
  status: ApiCallStatus;
  /** 요청 관찰 지연(ms). producer 실행 시간. */
  latencyMs: number;
  /** 실패/폴백 시 ApiError.code. 성공이면 생략. */
  errorKind?: string;
}

/**
 * 캐시 키 접두사에서 소스를 파생한다(`weather:...`→"weather"). 매핑되지 않으면 null.
 * cache.ts 의 키 빌더(weatherKey/vilageKey/airKey/uvKey/trailsKey)와 접두사를 공유한다.
 */
export function deriveSource(key: string): ApiSource | null {
  const prefix = key.split(":", 1)[0];
  switch (prefix) {
    case "weather":
    case "vilage":
    case "air":
    case "uv":
    case "trails":
      return prefix;
    default:
      return null;
  }
}

/**
 * 외부 API 호출 결과 1건을 `api_logs` 에 적재한다(fire-and-forget).
 * 절대 throw 하지 않으며 반환값도 없다(호출부는 await 하지 않는다).
 */
export function recordApiCall(record: ApiCallRecord): void {
  // 클라이언트 번들 방어(이 경로는 서버에서만 호출되지만 이중 안전).
  if (typeof window !== "undefined") return;

  try {
    const supabase = createPublicClient();
    void supabase
      .from("api_logs")
      .insert({
        source: record.source,
        status: record.status,
        latency_ms: Math.round(record.latencyMs),
        error_kind: record.errorKind ?? null,
      })
      .then(() => {
        // 성공/실패 모두 무시(best-effort). 로깅 실패는 모니터링 품질 저하만 유발.
      });
  } catch {
    // 클라이언트 생성 실패 등도 조용히 흡수.
  }
}
