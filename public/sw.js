/**
 * 산길날씨 서비스워커 (Task 030). 손수 작성(의존성 최소화, 결정 003 #13).
 *
 * 전략:
 *  - 앱 셸(정적 자원: /offline, 아이콘, Next 정적 청크 `/_next/static/…`) → **cache-first**.
 *  - 데이터·페이지 네비게이션(HTML, `/api/…`) → **network-first**, 실패 시 캐시 폴백.
 *    페이지가 캐시에도 없으면 `/offline` 을 보여준다("마지막 조회 결과" 는 캐시된 상세가 담당).
 *  - 버전(`VERSION`)이 바뀌면 activate 에서 이전 버전 캐시를 모두 정리한다.
 *
 * 캐시 오염을 피하려고 **GET·same-origin·http(s)** 요청만 다룬다(POST/크로스오리진은 패스스루).
 */

const VERSION = "v1";
const SHELL_CACHE = `sangil-shell-${VERSION}`;
const RUNTIME_CACHE = `sangil-runtime-${VERSION}`;

// 설치 시 미리 담아둘 앱 셸(정적, 해시 없는 안정 경로만).
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

/**
 * 오프라인 네비게이션 폴백 HTML — **자체 완결(청크 의존 0)**.
 * Next 페이지(예: /offline 라우트)는 하이드레이션에 해시된 JS 청크가 필요해, 온라인에서
 * 한 번도 안 열어본 페이지를 오프라인에서 셸로 쓰면 ChunkLoadError 가 난다. 그래서 셸
 * 폴백은 인라인 HTML 로 항상 렌더되게 한다(다시 연결되면 홈에서 최신 정보 재조회).
 */
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<link rel="icon" href="/icons/icon-192.png"/>
<title>오프라인 · 산길날씨</title>
<style>
:root{color-scheme:light dark}*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#fff;color:#0a0a0a}
@media(prefers-color-scheme:dark){body{background:#0a0a0a;color:#fafafa}}
.icon{width:56px;height:56px;border-radius:9999px;display:flex;align-items:center;justify-content:center;background:rgba(120,120,120,.15)}
h1{font-size:1.125rem;margin:0}p{font-size:.875rem;opacity:.7;margin:0;max-width:22rem}
a{display:inline-flex;align-items:center;height:44px;padding:0 20px;border-radius:8px;background:#1da54f;color:#fff;text-decoration:none;font-size:.875rem;font-weight:600}
</style></head>
<body>
<div class="icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><line x1="12" y1="20" x2="12.01" y2="20"/><line x1="2" y1="2" x2="22" y2="22"/></svg></div>
<h1>오프라인 상태예요</h1>
<p>인터넷 연결을 확인해 주세요. 연결되면 마지막으로 본 정보를 다시 불러옵니다.</p>
<a href="/">홈으로</a>
</body></html>`;

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // 개별 실패가 설치 전체를 막지 않도록 관대하게 담는다.
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("sangil-") && !keep.has(n)).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Next 정적 청크·아이콘 등 내용 불변(해시) 자원인지 판별 → cache-first 대상. */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

/** cache-first: 캐시에 있으면 즉시, 없으면 네트워크→런타임 캐시에 저장. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * network-first: 네트워크 우선, 성공 시 런타임 캐시에 갱신 저장. 실패(오프라인) 시
 * 캐시 폴백. 네비게이션이면 캐시에도 없을 때 `/offline` 셸을 반환하고, 그 외(API·RSC
 * 프리페치 등)는 `ERR_CONNECTION_REFUSED` 콘솔 노이즈 대신 graceful 503 을 반환한다
 * (프리페치 실패를 조용히 처리 — 앱은 계속 동작).
 */
async function networkFirst(request, { isNavigation, isRsc }) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // 네비게이션: 캐시에 없으면 자체 완결 오프라인 셸(청크 의존 0).
    if (isNavigation) return offlineResponse();
    // RSC 프리페치(백그라운드)는 오프라인 미스 시 204 로 조용히 처리(콘솔 에러 방지).
    if (isRsc) return new Response(null, { status: 204 });
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 크로스오리진(카카오 SDK·타일 등)은 브라우저에 위임
  if (!url.protocol.startsWith("http")) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 그 외 same-origin GET(페이지 네비게이션·API·RSC 프리페치 등) → network-first(캐시 폴백)
  const isRsc = url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
  event.respondWith(
    networkFirst(request, { isNavigation: request.mode === "navigate", isRsc }),
  );
});
