"use client";

import { useEffect } from "react";

/**
 * 서비스워커 등록기 (Task 030). 렌더 없이 마운트 시 `/sw.js` 를 등록한다.
 *
 * **프로덕션에서만** 등록한다 — 개발 모드의 캐싱 SW 는 Next HMR·정적 청크 갱신과 충돌해
 * 혼란을 준다. PWA 검증(설치·오프라인·Lighthouse)은 `npm run build && start` 로 수행한다.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("서비스워커 등록 실패:", err);
      });
    };

    // 초기 로드 경합을 피해 load 이후 등록(이미 로드됐으면 즉시).
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
