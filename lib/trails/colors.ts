import type { TrailStatus } from "@/lib/types";

/**
 * 탐방로 색상 상수 (Task 032). 지도 폴리라인·리스트 선택 표시가 **동일한 색**을 쓰도록
 * 단일 출처로 둔다.
 *
 * 카카오맵 폴리라인은 CSS 변수를 못 읽고 색 문자열(hex)이 필요하므로, `app/globals.css`
 * 의 `--status-*` HSL 토큰과 같은 색을 hex 로 옮겨 둔다(MapLegend 점 색과 일치).
 * 선택 강조바(리스트)도 이 hex 를 인라인 스타일로 그대로 써서 지도 강조선과 정확히 같은
 * 색으로 맞춘다(Tailwind 유틸 재생성에 의존하지 않아 견고하다).
 */

/** 상태별 폴리라인 색(= --status-* 라이트 모드 hex). */
export const TRAIL_STATUS_COLOR: Record<TrailStatus, string> = {
  open: "#1da54f", // 142 70% 38%
  closed: "#d32222", // 0 72% 48%
  partial: "#ce7c09", // 35 92% 42%
  unknown: "#737373", // 0 0% 45%
};

/** 선택 강조색(상태색과 구분되는 파랑). 지도 타일은 항상 밝아 단일 값으로 충분. */
export const TRAIL_HIGHLIGHT_COLOR = "#2563eb"; // 221 83% 53%
