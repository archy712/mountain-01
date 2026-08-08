/**
 * 외부 API 환경변수 접근·검증 유틸.
 *
 * - 서버 전용 키(공공데이터포털 발급)는 `serverEnv`로만 접근한다.
 *   `NEXT_PUBLIC_` 접두사가 없으므로 클라이언트 번들에 포함되지 않는다.
 *   반드시 서버(Route Handler·서버 유틸)에서만 import 할 것.
 * - 값이 없으면 명확한 메시지로 조기 실패시켜 원인 파악을 돕는다(지연 평가).
 *   모듈 로드시가 아니라 실제 사용 시점에 검증하므로, 키가 없는 CI·빌드 환경을
 *   불필요하게 깨뜨리지 않는다.
 *
 * 참고: 탐방로는 정적 CSV(국립공원공단)로 대체되어 별도 API 키가 필요 없다
 * (docs/decisions/001-data-sources.md #4 참조).
 */

function requireServerEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `필수 서버 환경변수 ${name} 가(이) 설정되지 않았습니다. .env.local 을 확인하세요 (.env.local.example 참고).`,
    );
  }
  return value;
}

export const serverEnv = {
  /** 기상청 단기예보(초단기실황·초단기예보·단기예보) 서비스 키 */
  get kmaServiceKey() {
    return requireServerEnv("KMA_SERVICE_KEY");
  },
  /** 한국환경공단 에어코리아 대기오염정보 서비스 키 */
  get airkoreaServiceKey() {
    return requireServerEnv("AIRKOREA_SERVICE_KEY");
  },
  /** 기상청 생활기상지수 V5(자외선 getUVIdxV5) 서비스 키 */
  get kmaLivingIndexKey() {
    return requireServerEnv("KMA_LIVING_INDEX_KEY");
  },
} as const;

/**
 * 서버 전용, 선택적 시크릿(미설정 허용).
 * - Supabase 서비스 롤 키: `condition_scores` 등 RLS 로 쓰기가 막힌 캐시 테이블에
 *   서버에서만 write 하기 위한 키(결정 003 RLS: 쓰기는 서비스 롤만). 미설정이면
 *   점수 캐시 영속을 건너뛰고 계산 결과만 반환한다(graceful degrade, Task 023).
 */
export const optionalServerEnv = {
  get supabaseServiceRoleKey(): string | undefined {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  },
} as const;

/**
 * 클라이언트에 노출되어도 되는 공개 키.
 * 카카오맵 JS 키는 Phase 5(Task 028)에서 발급·도메인 등록 후 사용한다.
 * 아직 미설정일 수 있으므로 undefined 를 허용한다.
 */
export const publicEnv = {
  get kakaoMapKey(): string | undefined {
    return process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  },
} as const;

/**
 * 1단계(날씨·탐방로) 동작에 필요한 서버 키가 모두 설정됐는지 검증한다.
 * 부팅 점검·테스트에서 한 번에 확인하는 용도. 누락 시 첫 누락 키에서 throw.
 */
export function assertPhase1ServerEnv(): void {
  // getter 접근만으로 누락 시 throw 된다. 조건문으로 감싸 반환값을 소비한다.
  if (!serverEnv.kmaServiceKey) {
    throw new Error("KMA_SERVICE_KEY 가(이) 필요합니다.");
  }
}
