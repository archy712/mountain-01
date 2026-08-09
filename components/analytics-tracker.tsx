"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

/**
 * 세션 시작 계측 (Task 035).
 *
 * 앱 최초 마운트 시 `session_start` 를 1회 기록한다. sessionStorage 가드로 같은 탭 세션에서
 * 라우팅·리마운트로 중복 집계되지 않게 한다(주간 세션 수·재방문율의 원천). 렌더 출력은 없다.
 */

const SESSION_FLAG = "sangil_session_started";

export function AnalyticsTracker() {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SESSION_FLAG)) return;
      window.sessionStorage.setItem(SESSION_FLAG, "1");
    } catch {
      // sessionStorage 불가 환경이면 가드 없이 1회 전송 시도.
    }
    track("session_start");
  }, []);

  return null;
}
