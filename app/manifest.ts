import type { MetadataRoute } from "next";

/**
 * PWA 매니페스트 (Task 030). Next 16 가 `/manifest.webmanifest` 로 서빙하고 `<head>` 에
 * 자동 링크한다. 브랜드명은 결정 002 #1(SanGil / 국문 "산길정보"), 아이콘은 `public/icons/*`.
 *
 * - `display: standalone` — 홈 화면 설치 시 브라우저 크롬 없이 앱처럼 실행.
 * - 아이콘: 192·512(any) + 512(maskable, 안전영역 내 글리프)로 설치·스플래시·홈 화면 대응.
 * - 색상은 라이트 스플래시에 맞춰 흰 배경(app/layout.tsx viewport themeColor 와 정합).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "산길정보 — 지금 이 산에 가도 될까?",
    short_name: "산길정보",
    description:
      "산 이름 하나로 오늘 날씨·탐방로 개방 여부·등산 컨디션을 3초 안에 확인하는 등산 날씨 앱.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ko",
    dir: "ltr",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["weather", "travel", "sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
