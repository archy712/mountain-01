/**
 * 외부 API 연동 공통 계약 타입.
 *
 * 설계 원칙(결정 003 #8·PRD 6장):
 * - 모든 외부 호출은 서버에서 프록시하고, 컴포넌트에는 앱 표준 스키마로 정규화해 전달한다.
 * - 소스별 독립 실패를 격리한다(날씨만 실패 / 탐방로만 실패 등).
 * - 실패 시 마지막 성공 응답(stale)을 `fetchedAt`과 함께 반환해 "N분 전 기준" 라벨을 지원한다.
 */

/** 표준 에러 코드. 사용자 친화 메시지와 폴백 분기의 기준. */
export type ApiErrorCode =
  | "timeout" // 외부 API 응답 지연
  | "upstream_error" // 외부 API 4xx/5xx
  | "rate_limited" // 호출 한도 초과
  | "parse_error" // 응답 파싱 실패
  | "not_found" // 대상 리소스 없음(예: 존재하지 않는 산)
  | "no_station" // 인근 측정소 없음(거리 임계값 초과, 결정 001 #5)
  | "not_covered" // 커버리지 밖(국립공원 외 탐방로 "정보 없음", 결정 001 #4)
  | "unknown";

export interface ApiError {
  code: ApiErrorCode;
  /** 사용자에게 그대로 노출 가능한 한국어 메시지 */
  message: string;
}

/**
 * 단일 외부 소스의 부분 실패를 표현하는 결과 타입.
 * - success: 최신 정상 데이터
 * - stale:   호출 실패했지만 마지막 성공 캐시를 반환(“N분 전 기준”)
 * - failure: 사용할 데이터 없음
 */
export type PartialResult<T> =
  | { status: "success"; data: T; fetchedAt: string }
  | { status: "stale"; data: T; fetchedAt: string; error: ApiError }
  | { status: "failure"; error: ApiError };

/** PartialResult 에서 사용 가능한 데이터가 있는지(정상 또는 stale) 판별. */
export function hasData<T>(
  result: PartialResult<T>,
): result is Extract<PartialResult<T>, { data: T }> {
  return result.status === "success" || result.status === "stale";
}

/**
 * Route Handler 공통 응답 타입.
 * - ok:      전 소스 정상
 * - partial: 일부 소스 실패했으나 표시 가능한 데이터 존재(issues 에 저하 목록)
 * - error:   표시할 데이터 없음
 * `fetchedAt` 은 ok·partial 에 포함되어 신선도 라벨 렌더에 사용된다.
 */
export type ApiResponse<T> =
  | { status: "ok"; data: T; fetchedAt: string }
  | { status: "partial"; data: T; fetchedAt: string; issues: ApiError[] }
  | { status: "error"; error: ApiError };

/**
 * 외부 API 원시 응답 → 앱 표준 스키마 정규화 함수 계약.
 * 파싱 실패 시 throw 하지 않고 `PartialResult.failure` 를 반환한다(부분 실패 격리).
 * 구현체는 Task 016·017·021·022 의 `lib/api/*` 에 위치한다.
 */
export type Normalizer<TOut> = (raw: unknown) => PartialResult<TOut>;
