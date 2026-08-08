/**
 * 서버 전용 외부 API fetch 래퍼 (Task 015).
 *
 * 모든 외부 호출은 이 래퍼를 거쳐 **서버(Route Handler·서버 유틸)에서만** 수행한다.
 * - API 키는 호출부(소스 모듈)가 `serverEnv`(lib/env.ts)로 읽어 넘긴다. 이 파일은 키를
 *   직접 읽지 않으며, 클라이언트 번들에 포함되면 안 된다.
 * - 공통 정책: 타임아웃(AbortController), 재시도(지수 백오프 1회), 표준 에러 매핑.
 * - 실패는 `FetchError`(errors.ts)로 throw 한다. 상위(withStaleFallback/정규화)에서
 *   `toApiError`로 정규화해 부분 실패를 격리한다.
 *
 * 참고: `server-only` 패키지가 이 저장소에 호이스팅돼 있지 않아, 대신 아래 런타임
 * 가드로 클라이언트 import 를 차단한다.
 */

import { FetchError, fetchErrorFromStatus } from "./errors";

if (typeof window !== "undefined") {
  throw new Error("lib/api/fetcher 는 서버 전용입니다. Client Component 에서 import 하지 마세요.");
}

export interface FetchJsonOptions {
  /** 쿼리 파라미터. 값은 문자열로 직렬화된다. */
  searchParams?: Record<string, string | number | undefined>;
  /** 요청 헤더 */
  headers?: Record<string, string>;
  /** 타임아웃(ms). 기본 8000. */
  timeoutMs?: number;
  /** 실패 시 추가 재시도 횟수. 기본 1(총 2회 시도). */
  retries?: number;
  /** 첫 재시도 지연(ms), 지수 백오프 기준. 기본 300. */
  retryBaseDelayMs?: number;
  /** 외부에서 취소하기 위한 signal(타임아웃 signal 과 함께 동작). */
  signal?: AbortSignal;
  /**
   * fetch 캐시 모드. 기본 "no-store"(HTTP 캐시 미사용, 신선도는 상위 "use cache" 가 담당).
   * ⚠️ 일부 공공 API 게이트웨이(예: 에어코리아 B552584)는 undici 가 no-store/no-cache 에
   * 붙이는 `Cache-Control` 요청 헤더를 거부해 503/행이 발생한다. 그런 소스는 "default" 로
   * 넘긴다("use cache" 가 이미 TTL 을 관리하므로 HTTP 캐시 모드는 신선도에 영향 없음).
   */
  cache?: RequestCache;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;
const DEFAULT_RETRY_BASE_DELAY_MS = 300;

function buildUrl(url: string, searchParams?: FetchJsonOptions["searchParams"]): string {
  if (!searchParams) return url;
  const u = new URL(url);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) u.searchParams.set(key, String(value));
  }
  return u.toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 단일 시도. 타임아웃·상태코드·네트워크 실패를 FetchError 로 변환한다. */
async function attempt(url: string, opts: FetchJsonOptions): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // 외부 signal 이 있으면 함께 취소되도록 연결한다.
  const onExternalAbort = () => controller.abort();
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    const res = await fetch(url, {
      headers: opts.headers,
      signal: controller.signal,
      // 캐싱은 상위 "use cache" 레이어가 담당한다. 기본은 HTTP 캐시를 끄되(no-store),
      // no-store 를 거부하는 게이트웨이(에어코리아)를 위해 호출부가 override 가능하게 한다.
      cache: opts.cache ?? "no-store",
    });
    if (!res.ok) {
      throw fetchErrorFromStatus(res.status);
    }
    return res;
  } catch (err) {
    if (err instanceof FetchError) throw err;
    // AbortController 취소 → 타임아웃으로 간주(재시도 대상).
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new FetchError("timeout", "요청 시간이 초과됐습니다.", {
        retryable: true,
        cause: err,
      });
    }
    // 그 외 네트워크 오류(DNS·연결 실패 등) → upstream, 재시도 대상.
    throw new FetchError("upstream_error", "외부 서비스에 연결하지 못했습니다.", {
      retryable: true,
      cause: err,
    });
  } finally {
    clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener("abort", onExternalAbort);
  }
}

/**
 * 재시도 정책을 적용해 Response 를 얻는다. 재시도 가능한 실패(5xx·429·타임아웃·네트워크)에만
 * 지수 백오프로 재시도하고, 4xx 등 비재시도 실패는 즉시 전파한다.
 */
async function fetchWithRetryInternal(url: string, opts: FetchJsonOptions): Promise<Response> {
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const baseDelay = opts.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;

  let lastError: FetchError | undefined;
  for (let i = 0; i <= retries; i++) {
    try {
      return await attempt(url, opts);
    } catch (err) {
      const fe =
        err instanceof FetchError
          ? err
          : new FetchError("unknown", "알 수 없는 오류", { cause: err });
      lastError = fe;
      // 마지막 시도이거나 재시도 불가면 중단.
      if (i === retries || !fe.retryable) break;
      // 지수 백오프: base * 2^i (i=0 → base, i=1 → 2*base ...)
      await sleep(baseDelay * 2 ** i);
    }
  }
  throw lastError ?? new FetchError("unknown", "알 수 없는 오류");
}

/**
 * JSON 응답을 가져와 파싱한다. 파싱 실패는 `parse_error`(비재시도)로 매핑한다.
 * 성공 시 파싱된 값을 반환하고, 실패 시 `FetchError` 를 throw 한다.
 */
export async function fetchJson<T = unknown>(url: string, opts: FetchJsonOptions = {}): Promise<T> {
  const finalUrl = buildUrl(url, opts.searchParams);
  const res = await fetchWithRetryInternal(finalUrl, opts);
  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new FetchError("parse_error", "응답 JSON 파싱에 실패했습니다.", { cause: err });
  }
}

/**
 * 텍스트 응답을 가져온다(예: 공공 API 가 오류를 XML/HTML 로 반환하는 경우 원문 확인용).
 * 정적 CSV(탐방로)는 파일 로드라 이 경로를 쓰지 않는다.
 */
export async function fetchText(url: string, opts: FetchJsonOptions = {}): Promise<string> {
  const finalUrl = buildUrl(url, opts.searchParams);
  const res = await fetchWithRetryInternal(finalUrl, opts);
  try {
    return await res.text();
  } catch (err) {
    throw new FetchError("parse_error", "응답 본문 읽기에 실패했습니다.", { cause: err });
  }
}
