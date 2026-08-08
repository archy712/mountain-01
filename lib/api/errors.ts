/**
 * 외부 API 표준 에러 매핑 (Task 015).
 *
 * fetcher/정규화 파이프라인에서 발생한 실패를 사용자 친화 한국어 메시지를 가진
 * `ApiError`(lib/types/api.ts)로 일원화한다. 폴백 분기(no_station·not_covered 등)의
 * 기준이 되며, 소스 모듈(Task 016·017·021·022)은 이 팩토리로 에러를 만든다.
 */

import type { ApiError, ApiErrorCode } from "@/lib/types";

/** 코드별 기본 사용자 메시지. 소스별로 필요 시 message 를 덮어쓴다. */
export const API_ERROR_MESSAGE: Record<ApiErrorCode, string> = {
  timeout: "요청 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.",
  upstream_error: "외부 서비스에서 정보를 불러오지 못했습니다.",
  rate_limited: "일시적으로 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
  parse_error: "받은 데이터를 해석하지 못했습니다.",
  not_found: "요청하신 정보를 찾을 수 없습니다.",
  no_station: "인근 측정소가 없어 정보를 제공할 수 없습니다.",
  not_covered: "제공 범위 밖이라 정보가 없습니다.",
  unknown: "알 수 없는 오류가 발생했습니다.",
};

/** 표준 에러 객체 생성. message 미지정 시 코드별 기본 메시지를 쓴다. */
export function apiError(code: ApiErrorCode, message?: string): ApiError {
  return { code, message: message ?? API_ERROR_MESSAGE[code] };
}

/**
 * fetcher 내부에서 throw 하는 태그드 에러.
 * 원시 실패(HTTP 상태·타임아웃·네트워크)를 `ApiErrorCode` 와 함께 실어 나른다.
 * `retryable` 은 지수 백오프 재시도 대상 여부(5xx·429·네트워크·타임아웃 → true).
 */
export class FetchError extends Error {
  readonly code: ApiErrorCode;
  readonly retryable: boolean;
  /** upstream 응답 상태코드(있으면). */
  readonly status?: number;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: { retryable?: boolean; status?: number; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "FetchError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.status = options?.status;
  }
}

/** HTTP 상태코드 → ApiErrorCode·재시도 여부 매핑. */
export function fetchErrorFromStatus(status: number): FetchError {
  if (status === 429) {
    return new FetchError("rate_limited", API_ERROR_MESSAGE.rate_limited, {
      retryable: true,
      status,
    });
  }
  if (status >= 500) {
    return new FetchError("upstream_error", `외부 서비스 오류 (HTTP ${status})`, {
      retryable: true,
      status,
    });
  }
  if (status === 404) {
    return new FetchError("not_found", API_ERROR_MESSAGE.not_found, {
      retryable: false,
      status,
    });
  }
  // 그 외 4xx(400·401·403 등)는 재시도해도 동일하므로 non-retryable.
  return new FetchError("upstream_error", `외부 서비스 요청 실패 (HTTP ${status})`, {
    retryable: false,
    status,
  });
}

/**
 * 임의의 throw 값 → `ApiError` 로 정규화한다.
 * - `FetchError`: 실린 code/message 사용
 * - `AbortError`(타임아웃): timeout
 * - 그 외: unknown
 * 절대 다시 throw 하지 않는다(부분 실패 격리 계약).
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof FetchError) {
    return apiError(err.code, err.message);
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return apiError("timeout");
  }
  if (err instanceof Error && err.name === "AbortError") {
    return apiError("timeout");
  }
  return apiError("unknown");
}
