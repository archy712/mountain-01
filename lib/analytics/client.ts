/**
 * 클라이언트 KPI 계측 (Task 035).
 *
 * 프라이버시-세이프한 익명 이벤트를 `/api/analytics` 로 fire-and-forget 전송한다.
 * - `anon_id`: localStorage 에 저장하는 랜덤 UUID(개인 식별 불가). 세션/재방문 dedup 과
 *   완료율·전환율 집계에만 쓰인다. 서버·쿠키·계정과 연결하지 않는다.
 * - 전송 실패는 조용히 흡수한다(집계 품질 저하만, 사용자 흐름과 무관).
 *
 * 서버(RSC)에서 import 하지 말 것 — `window`/`localStorage` 에 의존한다.
 */

/** 계측 이벤트명. analytics_events.event CHECK 제약과 일치해야 한다. */
export type AnalyticsEvent =
  | "session_start"
  | "search_session"
  | "search_result_selected"
  | "mountain_view"
  | "favorite_add"
  | "favorite_remove"
  | "visited_add"
  | "visited_remove"
  | "pwa_prompt_shown"
  | "pwa_install_accepted"
  | "pwa_install_dismissed"
  | "app_installed";

const ANON_ID_KEY = "sangil_anon_id";

/** 익명 클라이언트 식별자를 반환한다(없으면 생성·저장). 서버/스토리지 불가 환경이면 undefined. */
export function getAnonId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    let id = window.localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    // 프라이빗 모드 등 localStorage 접근 불가 — 익명 식별자 없이도 이벤트는 보낸다.
    return undefined;
  }
}

interface TrackOptions {
  mountainId?: string;
  props?: Record<string, unknown>;
}

/**
 * 이벤트 1건을 서버로 전송한다(fire-and-forget). 절대 throw 하지 않는다.
 * `keepalive` 로 페이지 이탈·설치 전환 직전에도 유실을 줄인다.
 */
export function track(event: AnalyticsEvent, options: TrackOptions = {}): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event,
        anonId: getAnonId(),
        mountainId: options.mountainId,
        props: options.props,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 무시
  }
}
