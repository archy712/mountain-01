# Phase 5 · 3단계 완료 기준 검증 (Task 031)

- **일자**: 2026-08-09
- **도구**: Playwright MCP(360px, `browser_navigate`/`browser_evaluate`/`browser_run_code_unsafe`/스냅샷/콘솔), 프로덕션 빌드(`next start`) — **PWA·SW 는 프로덕션 전용 등록**이라 `next start` 로 검증
- **대상**: 산 상세(`/mountains/[id]`), 전체화면 지도(`/mountains/[id]/map`), 오프라인 폴백, 매니페스트/서비스워커/설치 배너
- **기준선**: `npm run typecheck` · `npm run lint` · `npm run build` 전부 통과(`/mountains/[id]`·`/mountains/[id]/map` `◐` PPR, `/manifest.webmanifest`·`/offline` `○` 정적)

## PRD 4.3 완료 기준 5항목

| # | 완료 기준 | 결과 | 근거 |
| - | --- | --- | --- |
| 1 | 산 상세에서 카카오맵과 등산로 폴리라인이 표시된다 | ✅ | 가야산 지도: 타일(canvas/img) 렌더 + 등산로 폴리라인 **11 세그먼트**. 상세 섹션(220px)·전체화면(70dvh) 모두 |
| 2 | 통제 구간이 색상으로 구분된다(데이터 있는 경우) | ✅ | 주왕산: **개방 8(초록 `#1da54f`) + 통제 6(빨강 `#d32222`)**, `--status-*` 토큰과 hex 정합. 범례 **텍스트 병기**(개방/부분통제/통제, 색상 단독 금지). 통제를 개방 위에 렌더 |
| 3 | Android Chrome에서 "홈 화면에 추가"가 동작한다 | ✅ | `beforeinstallprompt` 캡처→`preventDefault`(기본 미니바 억제, cancelable 이벤트서 `defaultPrevented=true`)→배너 노출, "설치"→`prompt()` **1회 호출**·설치 후 숨김, "닫기"→`localStorage` 디스미스 **지속**. 매니페스트 `display:standalone`·아이콘 192/512/maskable |
| 4 | 오프라인 시 마지막 조회 결과 또는 오프라인 안내가 표시된다 | ✅ | 서버 중단(오프라인) 후: **캐시된 가야산 상세 전체 렌더**(h1 "가야산", 콘솔 에러 0) / **미캐시 주왕산 → 인라인 오프라인 폴백**("오프라인 상태예요", 콘솔 에러 0) |
| 5 | 지도 스크립트 로드 실패 시 정적 좌표/링크 폴백이 제공된다 | ✅ | `dapi.kakao.com` 요청 **차단(route abort)** 후 지도 페이지: **"지도를 표시할 수 없어요" + "위치: 위도 35.8250, 경도 128.1200" + 카카오맵 외부 링크**(`map.kakao.com/link/map/가야산,35.825,128.12`) 폴백. 앱 크래시 없음 |

## 성능 — 지도 도입 후 LCP 회귀 검증

| 항목 | 측정 | 결과 |
| --- | --- | --- |
| **LCP 요소** | `SPAN.text-5xl`(컨디션 점수 히어로) | **지도/폴리라인이 LCP 요소가 아님** → 지도 도입에 의한 회귀 없음 |
| LCP(웜 캐시) | **852ms** | 1단계 2.5s 목표 충족 |
| LCP(콜드) | 11.0s | 컨디션 점수 섹션이 외부 API(날씨·대기·자외선) 콜드 응답을 대기한 값 — Task 032 최적화 대상 |
| FCP | 116ms | 정적 PPR 셸(지도 컨테이너 포함)이 즉시 페인트 |

- **회귀 판정**: 지도(타일·마커)·폴리라인 오버레이는 셸 렌더 이후 **클라이언트에서 비동기 부착 + 독립 `<Suspense>`/`connection()` 스트리밍**이라 LCP 임계 경로에 들지 않는다. LCP 요소는 Phase 4(Task 023)에서 추가된 컨디션 점수 히어로로, 지도 도입 전후 동일하다 → **지도 도입 성능 회귀 없음**.
- 콜드 LCP(11s)는 외부 공개 API 첫 호출 지연이 지배적이며, `'use cache'` 웜 시 852ms. **정밀 4G 스로틀·캐시 히트율 재조정·LCP 2.0s 목표는 Task 032** 범위.

## 서비스워커 · 캐싱 (등록 및 갱신)

| 항목 | 결과 | 근거 |
| --- | --- | --- |
| SW 등록·활성·제어 | ✅ | `navigator.serviceWorker` registration active, scope `/`, controller 존재(프로덕션) |
| 매니페스트 서빙·링크 | ✅ | `/manifest.webmanifest` 200(`application/manifest+json`), `<head>` link[rel=manifest]·apple-touch-icon·theme-color |
| 앱 셸 precache | ✅ | `sangil-shell-v1`: `/manifest.webmanifest`·아이콘 4종 |
| 런타임 캐시 | ✅ | `sangil-runtime-v1`: Next 정적 청크·CSS·폰트(cache-first) + 방문한 산 상세(network-first) |
| **버전 갱신 정리** | ✅ | 구버전 `sangil-shell-v0` 주입 후 재활성화 시 **삭제**, 현재 `v1` 유지, 무관한 타사 캐시(`other-app-cache`) **보존** |
| proxy 접근성 | ✅ | `/sw.js`·`/manifest.webmanifest` 를 매처에서 제외 → 인증 리다이렉트 없이 200 |

## 콘솔 오류

- 지도·폴리라인·오프라인(캐시/폴백) 앱 콘솔 **JS 에러 0건**.
- 기준⑤ 검증 중 `dapi.kakao.com` 차단으로 유발된 `net::ERR_FAILED` 1건은 **의도된 SDK 로드 실패**(폴백 트리거)로 앱 크래시가 아님.
- 오프라인 RSC 프리페치는 SW 가 **204** 로 조용히 처리, 네비게이션 미스는 **인라인 오프라인 HTML**(청크 의존 0 → ChunkLoadError 회피)로 처리해 콘솔 클린.

## 잔여 항목 (범위 밖)

- **정밀 4G 스로틀 LCP(2.0s 목표)·캐시 히트율 재조정·Lighthouse 정식 리포트** → Task 032. installability 요건(매니페스트·SW·아이콘·standalone)은 본 검증에서 충족 확인.
- 실기기 Android Chrome "홈 화면에 추가"·iOS 수동 설치 안내는 실단말 QA 대상(에뮬레이션 한계). 설치 로직(`beforeinstallprompt`→`prompt()`)은 합성 이벤트로 실증.

## 최종 상태

- `npm run typecheck` · `npm run lint` · `npm run build` 통과.
- PRD 4.3 완료 기준 5항목·성능(지도 무회귀)·SW 등록/갱신 전수 통과. **3단계(지도 + PWA) 완료 기준 충족**.
