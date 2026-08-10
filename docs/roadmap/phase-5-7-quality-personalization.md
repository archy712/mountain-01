# 로드맵 — Phase 5~7 (지도·PWA·품질·개인화)

> [← ROADMAP 허브](../ROADMAP.md) · 지도+PWA → 품질·성능·운영 → 개인화·콘텐츠 확장 (Task 028~038).
> 상태 표기 규칙·개발 워크플로우·Phase↔PRD 매핑은 허브를 참조하세요.

### Phase 5: 3단계 구현 (지도 + PWA)

> **🔶#15 확정: 국립공원공단 `mountain.csv`로 등산로 좌표 확보(PoC 통과).** Task 029는 폴리라인 오버레이를 **정식 구현**한다(국립공원 범위). 국립공원 밖 산은 산 위치 마커 + 탐방로 목록으로 표시한다.

- **✅ Task 028: 카카오맵 SDK 통합 구현** - 완료
  - ✅ 카카오맵 JS 키 발급·도메인 등록(`http://localhost:3000`)·**카카오맵 제품 활성화**(콘솔 개편으로 도메인은 앱 키 하위·JS 키 설정으로 이동, 제품 미활성 시 `OPEN_MAP_AND_LOCAL disabled` 403을 브라우저가 `ERR_BLOCKED_BY_ORB`로 차단하는 것 실측 규명). 앱 키는 서버 컴포넌트가 `publicEnv.kakaoMapKey`(NEXT_PUBLIC)로 읽어 prop 주입 → 클라이언트 번들에 서버 키 미노출
  - ✅ `KakaoMap` Client Component — SDK **지연 로딩**(`autoload=false` 스크립트를 **모듈 스코프 캐시로 1회만** 주입, `kakao.maps.load` 콜백 이후 지도 생성). 생명주기: `useEffect` 로 지도·마커 생성, 언마운트 시 마커 `setMap(null)` 정리, 초기화 예외 try/catch → 폴백. `role="application"`+`aria-label` 접근성
  - ✅ `mountains.lat/lng` 기반 산 위치 마커 + 초기 줌 레벨(상세 섹션 level 6·전체화면 level 5)
  - ✅ `/mountains/[id]` 지도 섹션 및 `/mountains/[id]/map` 전체화면 지도 연결(둘 다 PPR 정적 셸 유지 → 클라이언트에서 비동기 부착, **지도가 LCP 요소가 아님** 실측 확인)
  - ✅ **폴백**(스크립트 로드 실패 + 앱 키 미설정 공통 경로) — 정적 좌표 텍스트("위도/경도") + 카카오맵 외부 링크(`map.kakao.com/link/map/{name},{lat},{lng}`) 제공. 지도가 없어도 앱 크래시 없이 위치 확인·이동 가능. 최소 타입 선언(`types/kakao-maps.d.ts`)으로 `any` 없이 타입 안전
  - ✅ **테스트**: Playwright MCP(360px) — **키 없음 폴백**(상세·전체화면 둘 다 정적 좌표+외부 링크 노출) → **키 설정·제품 활성화 후 실 지도 렌더**(가야산 상왕봉 마커·지형 타일·`window.kakao.maps` 로드·컨테이너 canvas/img·폴백 미표시) 라이브 실증, 콘솔 에러 0건. LCP 요소=점수 span(지도 아님)으로 지도 비저해 확인. `typecheck`·`lint`·`build` 통과(`/mountains/[id]`·`.../map` `◐` PPR 프리렌더)
  - **산출물**: ✅ `components/kakao-map.tsx`, `types/kakao-maps.d.ts`, `app/(main)/mountains/[id]/page.tsx`(지도 섹션 연동), `app/(main)/mountains/[id]/map/page.tsx`(전체화면 연동)
  - **의존성**: Task 001(#15), Task 027

- **✅ Task 029: 등산로 GeoJSON 적재 및 오버레이 구현** - 완료
  - ✅ CSV→GeoJSON 파이프라인(`lib/trails/csv-to-geojson.ts`, Node 전용) — `mountain.csv` 좌표(WGS84, 재투영 불필요·결정 001 #15)를 코스ID 단위로 순서 보존 파싱 → **RDP 단순화**(반복 구현, 허용오차 3m, equirectangular 미터 투영 수직거리) → (산 slug, 코스명) MultiLineString 집약. Task 017 과 **동일한 매핑/정규화**(mountain-name-matcher)를 써서 시드된 trail 행에 정확히 대응. **774,682점 → 39,156점(5.1%)로 감축**, 좌표 6자리 반올림
  - ✅ `trails.path_geojson` 적재 — 스키마 컬럼은 Task 007 에서 이미 생성됨(스키마 변경 없음 → `database.types.ts` 재생성 불필요). 0.88MB 데이터를 MCP 인라인(컨텍스트 폭증) 대신 **서비스 롤 클라이언트 직접 UPDATE 로더**(`load-trails-geojson.ts`)로 적재 — (mountain_id, name) 매칭으로 **316/316 업데이트·미매칭 0·실패 0**(id·이름 파생키 정합 실증). 생성 SQL 도 산출물로 보존(`trails_geojson.sql`). DB 검증: **316 trails / 16개 산**에 geojson(1개는 유효 선분 부족으로 마커 폴백)
  - ✅ `TrailOverlay`(`components/trail-overlay.tsx`) — `KakaoMap` 이 컨텍스트로 공개한 지도 핸들을 구독해 폴리라인을 `useEffect` 에서 생성·언마운트 시 `setMap(null)` 정리(명령형 API 대응). `KakaoMap` 은 지도 준비 후 children 에 핸들 제공하도록 확장(`useKakaoMapHandle`)
  - ✅ **통제 구간 색상 구분** — 상태별 폴리라인 색(`TRAIL_STATUS_COLOR`, `--status-*` 토큰 hex 정합: 개방#1da54f·통제#d32222·부분통제#ce7c09)으로 `MapLegend` 점 색과 일치(색상 단독 금지 → 범례 아이콘+텍스트 병기). **오늘 실효 상태로 색칠**(계절 통제는 기간·조회일로 재계산) — `getTrailPathsForMountain` + `<Suspense>`+`connection()` 동적 스트리밍(지도 셸은 정적 PPR 유지). 통제를 개방 위에 그려 가림 방지
  - ✅ 국립공원 외(GeoJSON 미보유) 축소 폴백 — 빈 배열 → 폴리라인 미렌더, 마커+목록만 유지(관악산 실증)
  - ✅ **테스트**: Playwright MCP 라이브(360px) — 가야산(개방 폴리라인 11세그먼트 초록), **주왕산 색상 구분(개방 8 초록 + 상시통제 6 빨강**, 상세 220px·전체화면 70dvh 양쪽), 설악산(계절통제 12개가 오늘 8/9 개방으로 정확 재계산→초록, 울산바위는 geojson 부재), **관악산 폴백(폴리라인 0·마커만·크래시 0)**. 콘솔 에러 0건, `typecheck`·`lint`·`build` 통과(두 지도 라우트 `◐` PPR 유지)
  - **산출물**: ✅ `components/trail-overlay.tsx`, `components/kakao-map.tsx`(핸들 컨텍스트·children), `lib/trails/csv-to-geojson.ts`, `lib/data/mountain-detail.ts`(`getTrailPathsForMountain`), `lib/types/mountain.ts`(`TrailPath`), `supabase/seed/{gen-trails-geojson.ts,load-trails-geojson.ts,trails_geojson.sql}`, `app/(main)/mountains/[id]/{page.tsx,map/page.tsx}`
  - **의존성**: Task 028, Task 017 (CSV 파서 재사용)

- **✅ Task 030: PWA 적용 및 오프라인 폴백 구현** - 완료
  - ✅ `app/manifest.ts`(Next 16 `/manifest.webmanifest`) — 브랜드명 "산길날씨"/short_name(결정 002 #1), `display: standalone`, portrait, 흰 배경·테마색(viewport themeColor 정합), 아이콘 세트. 아이콘은 `sharp` 로 SVG(산+태양 글리프)→PNG **192/512(any)+512(maskable, 안전영역 내)+180(apple-touch)** 생성. layout 에 apple-web-app·apple-touch-icon 메타 배선
  - ✅ 서비스워커(`public/sw.js`, 손수 작성·의존성 0, 결정 003 #13) — **앱 셸 precache + 정적자원(`/_next/static`·아이콘·manifest) cache-first**, **네비게이션·API·RSC 데이터 network-first(캐시 폴백)**. `activate` 에서 **버전(v1) 외 `sangil-*` 캐시 정리**(타사 캐시 보존). 오프라인 미스: 네비게이션은 **자체 완결 인라인 오프라인 HTML**(Next 청크 의존 0 → ChunkLoadError 회피), RSC 프리페치는 204·기타는 503 으로 콘솔 노이즈 억제
  - ✅ `PwaInstallPrompt` 동작 — `beforeinstallprompt` 캡처·`preventDefault`(기본 미니바 억제) 후 배너 노출, "설치"→`prompt()`, "닫기"→`localStorage` 디스미스 기록(재노출 억제). 이미 설치(standalone)·디스미스 상태면 숨김
  - ✅ 오프라인 폴백 — 마지막 조회한 산 상세는 **캐시된 페이지로 렌더**("N분 전 기준" 라벨 포함), 미조회 페이지는 인라인 오프라인 안내. `ServiceWorkerRegister`(프로덕션 전용, dev HMR 충돌 회피)로 등록
  - ✅ **proxy 매처 보정** — `/sw.js`·`/manifest.webmanifest` 가 인증 가드에 걸려 로그인 리다이렉트되던 문제를 매처 제외로 해결(쿠키 로직 불변). 카카오맵 제품 활성화 흐름처럼 **에어코리아 게이트웨이류 무관**
  - ✅ **테스트**: Playwright MCP(360px, 프로덕션 빌드) — 매니페스트 서빙·head 링크, **SW 등록·활성·제어**, precache/runtime 캐시 적재, **오프라인(서버 중단) 캐시 페이지 렌더 0 에러 + 미캐시→인라인 폴백 0 에러**, **버전 정리(v0 삭제·v1 유지·타사 보존)**, **설치 배너(prompt 호출·디스미스 지속)** 전부 실증. `typecheck`·`lint`·`build` 통과. ⏳ Lighthouse 정식 리포트는 Task 032 성능 검증에서 함께 수행(installability 요건 매니페스트·SW·아이콘·standalone 충족 확인)
  - **산출물**: ✅ `app/manifest.ts`, `public/sw.js`, `public/icons/*`(svg+png 5종), `components/service-worker-register.tsx`, `components/pwa-install-prompt.tsx`, `app/offline/page.tsx`(유지), `app/layout.tsx`(SW 등록·메타), `proxy.ts`(매처)
  - **의존성**: Task 002(#1), Task 003(#13), Task 027

- **✅ Task 031: 3단계 완료 기준 검증 (통합 테스트)** - 완료
  - ✅ PRD 4.3 완료 기준 5항목 전수 통과 (Playwright MCP E2E, 360px, 프로덕션 빌드)
    - ✅ 카카오맵 + 등산로 폴리라인 표시(가야산 타일+폴리라인 11세그먼트, 상세·전체화면)
    - ✅ 통제 구간 색상 구분(주왕산 개방 8 초록 + 통제 6 빨강, 범례 텍스트 병기)
    - ✅ "홈 화면에 추가"(설치 배너·preventDefault·`prompt()` 호출·디스미스 지속)
    - ✅ 오프라인(캐시된 상세 렌더 0에러 + 미캐시→인라인 오프라인 폴백 0에러)
    - ✅ 지도 스크립트 로드 실패 폴백(`dapi.kakao.com` 차단 시 정적 좌표+카카오맵 링크)
  - ✅ 지도 도입 후 성능 회귀 검증 — **LCP 요소=컨디션 점수 히어로(지도 아님) → 지도 무회귀**. 웜 852ms·FCP 116ms(지도·오버레이는 셸 이후 비동기 스트리밍이라 임계경로 밖). 콜드 11s(외부 API)·정밀 4G·Lighthouse 는 Task 032
  - ✅ SW 등록·활성·제어, 매니페스트 서빙·링크, 앱셸 precache/런타임 캐시, **버전 갱신 정리**(v0 삭제·v1 유지·타사 보존) 실증
  - **산출물**: ✅ `docs/test-reports/phase5-map-pwa.md`
  - **의존성**: Task 029, Task 030

---

### Phase 6: 품질·성능·운영

- **✅ Task 032: 성능 최적화 (LCP 2.0s 목표)** - 완료
  - ✅ 결과 페이지 LCP 모바일 4G(Slow 4G 1.6Mbps·RTT 150ms + CPU 4x, 360px) **2.0s 이하 달성** — 홈 156ms·상세 웜 484ms·**상세 콜드 1484ms**(모두 LCP 요소=콘텐츠 히어로: 홈 H1, 상세 컨디션 점수 span). PPR 정적 셸 + 소스별 독립 스트리밍(Task 019)으로 콘텐츠 성능은 이미 우수했고 번들도 슬림(청크 총 1.2MB)이라 위험한 축소 불요
  - ✅ **콜드 스트리밍 CLS 0.88 → 0** — 스트리밍 섹션 스켈레톤(날씨·컨디션·탐방로)이 실제 콘텐츠보다 짧아(예: 날씨 요약카드만 덮음, 실제 606px) 콜드 스태거드 도착 시 아래를 밀어내던 문제를, **스켈레톤을 실제 구조·높이에 맞춰 예약**(일출·시간별·3일예보 / 대기·자외선 3타일·장비 / 코스 요약바·행)해 해소
  - ✅ **PWA 배너의 LCP 잠식 제거** — 하단 고정 배너 텍스트가 점수 span보다 근소하게 커 LCP를 최대 2412ms까지 끌어올리던 문제를, **배너를 최초 사용자 상호작용 이후에만 노출**(LCP는 첫 입력 시 확정 → 임계경로 배제, 설치 유도도 콘텐츠 확인 뒤로 미뤄 UX 개선). 상호작용 전 미노출·후 정상 등장(설치 플로우 유지) 실증
  - ✅ **헤더 하이드레이션 CLS 제거** — `ThemeSwitcher`가 하이드레이션 전 `null` 대신 동일 크기(`size-11`) 자리 예약 + `AuthButton` Suspense 폴백 크기 정합(`h-11 w-[104px]`)
  - ✅ 외부 API 캐시 히트율·TTL 실측(🔶#8) — 콜드 vs 웜: 날씨 1.16s→43ms·컨디션 1.12s→44ms·대기 0.1~0.2s→44ms·자외선 72ms→24ms·탐방로 72ms→44ms. **현행 TTL(발표주기 정렬, 결정 003)은 적정 → 재튜닝 불요**. 에어코리아 간헐 게이트웨이 지연(1회 13.4s)은 일시 현상이며 8s 타임아웃 + 대기질 소스 격리로 방어됨(콜드 컨디션 1.1s대 유지)
  - ✅ 지도 지연 로딩 재검증 — 카카오맵 SDK는 셸 렌더 후 비동기 부착(LCP 요소 아님) 확인, 불필요한 리렌더 없음
  - ✅ 기준선 — `typecheck`·`lint`·`build` 통과(`/mountains/[id]`·`/` `◐` PPR 프리렌더 유지), 앱 콘솔 JS 에러 0건
  - **산출물**: ✅ `docs/test-reports/phase6-performance.md`, 수정 커밋(`app/(main)/mountains/[id]/page.tsx`·`components/{pwa-install-prompt,theme-switcher,site-header}.tsx`)
  - **의존성**: Task 031

- **✅ Task 033: 접근성·에러/로딩 폴백 전면 감사** - 완료
  - ✅ **터치 타깃 44px 전수(라이브 실측)** — 클래스가 아닌 실제 렌더 크기를 Playwright로 스윕. Task 013이 이연한 auth 폼·헤더 인증 등 다수 36/32px 위반을 교정: Input 프리미티브 `h-11`, 폼 제출·Google 버튼 `h-11`, 헤더 즐겨찾기(`min-w-11`)·로그인·로그아웃 `h-11`, 에러 재시도 `h-11`, 즐겨찾기 로그인 CTA·최근검색 "전체 삭제"·로그인 "비밀번호를 잊으셨나요?" 링크 보정. **재스윕 결과 홈·상세·로그인 위반 0건**(문장 내 인라인 링크는 WCAG 2.5.8 예외로 유지)
  - ✅ **폼 라벨/aria** — 라벨 완비 확인. 폼 에러 6곳(`text-red-500`·`role` 없음 → 스크린리더 미고지)을 **`role="alert"` + `text-destructive`** 로 교정(profile 성공은 `role="status"`)
  - ✅ **색상 단독 구분 금지 / 게이지 텍스트 병기** — 탐방로 배지·등급·점수칩·범례·난이도 별점·대기자외선 타일 모두 아이콘/텍스트 병기, 게이지 `role="img"` + 점수·등급 aria 라벨 확인
  - ✅ **로딩 스켈레톤** — 전 데이터 페칭 구간(검색·인기산·컨디션·날씨·탐방로·지도 오버레이·즐겨찾기) 스켈레톤/`<Suspense>` 존재 확인(높이 정렬로 CLS 0, Task 032)
  - ✅ **에러 경로 재시도 버튼** — 소스별 부분 실패(날씨/탐방로) 폴백에 재시도가 없던 문제를 `ErrorFallback` 의 **`refreshOnRetry`**(서버 컴포넌트용 `router.refresh()`) 추가로 해소(라우트 `error.tsx` 는 기존 `reset`)
  - ✅ **폴백 매트릭스 5종 검증** — 탐방로 "정보 없음"(관악산)·지도 실패(카카오 도메인 차단→정적 좌표+외부 링크)는 **라이브**, 대기·자외선 제외 배지·stale "N분 전 기준"·날씨 실패+독립 렌더는 코드 경로 + Task 019/020/024 라이브 실증으로 확인
  - ✅ **스크린리더 흐름** — 단일 h1·랜드마크 완비 확인, 날씨 섹션 제목 누락으로 인한 제목 위계 오중첩을 **sr-only h2 "오늘 날씨"** 추가 + 장비 h2→h3 조정으로 교정(스킵 0). 포커스 가시성(Task 013) 유지
  - ✅ 기준선 — `typecheck`·`lint`·`build` 통과, 앱 콘솔 JS 에러 0건
  - **산출물**: ✅ `docs/test-reports/a11y-fallback-audit.md`, 수정 커밋(`components/ui/input.tsx`·`components/*-form.tsx`·`components/{google-auth-button,logout-button,auth-button,favorite-button,recent-searches,error-fallback,weather-summary-card,trail-list,gear-recommendation-list}.tsx`·`app/(main)/mountains/[id]/page.tsx`)
  - **의존성**: Task 031

- **✅ Task 034: 산 상세 정보 확장 및 로딩 UX 개선** - 완료
  - ✅ **탐방로 거리·소요시간 버그 수정** — KNPS CSV 파서가 코스ID 단위로만 중복 제거해 여러 세그먼트(일련번호)로 쪼개진 코스(예: 한라산 성판악)에서 첫 세그먼트만 남던 문제 해결. 중복 제거 키에 `일련번호`를 포함해 세그먼트를 보존, `gen-trails`의 (산,코스명) 합산이 정상 동작하도록 수정 후 시드 재생성·DB 반영(성판악 2.3km/1시간30분 → **9.6km/4시간30분**)
  - ✅ **스트리밍 로딩 인디케이터 바** — 컨디션 히어로·날씨·탐방로 스켈레톤 상단에 순수 CSS 무한(indeterminate) 진행바를 얹어 로딩 진행감 전달(의존성·클라이언트 JS 0, `aria-hidden`+컨테이너 `aria-busy`, `prefers-reduced-motion` 대응). 스켈레톤은 유지해 CLS 회피
  - ✅ **미세먼지·자외선 실수치 노출** — 서버가 이미 조회하던 값을 `ConditionBundle`에 실어 감점 근거를 실제 수치로 뒷받침. 초기엔 기존 배지 2종을 재사용했으나, 자외선이 고아처럼 떨어져 보이는 문제로 **날씨 카드와 동일한 3칸 타일(PM10·PM2.5·자외선) 패널 `AirUvSummary`로 통합**(기존 `AirQualityBadge`·`UvIndexBadge` 제거): PM10/PM2.5·측정소·거리, UV 지수·등급
  - ✅ **탐방로 난이도 별점** — KNPS 난이도 지수(경사만 반영, 코스 길이 무시)가 체감과 어긋나 **오름 소요시간 기준**(5분위)으로 별 5개 스케일 시각화(`TrailDifficulty`, 색상+텍스트 병기). 소요시간은 전 코스에 존재해 한라산 등 지수 결측 산도 표시됨
  - ✅ **확장 예보** — 동일 단기예보 응답 하나를 재파싱(추가 네트워크 0)해 체감온도(호주 기상청 apparent temperature)·오늘 최저/최고(TMN·TMX)·시간대별·3일 예보 제공. `getWeatherForecast`(스냅샷과 캐시 공유, stale 키 분리), `HourlyForecastStrip`·`DailyForecastList`
  - ✅ **일출·일몰** — 위경도로 USNO 알고리즘 계산(외부 API 불필요, `lib/geo/sun-times.ts`), 실측 대비 1~2분 오차 검증. `SunTimesRow`
  - ✅ **코스 요약 통계** — 개방/통제 현황·거리 범위 집계 바를 탐방로 목록 상단에 추가(`lib/trails/summary.ts`, `TrailSummaryBar`)
  - ✅ **문서 반영** — 신규 데이터 소스가 필요한 상세 확장(4순위: 실시간 통제·산불위험·주차/교통·편의시설·사진·후기·계절/야생동물)을 `README.md`·`docs/PRD.md`(10.1)에 향후 개발 계획으로 기재
  - ✅ **검증** — `typecheck`·`lint` 통과, Playwright MCP 라이브(한라산)에서 신규 섹션 전수 렌더 확인
  - **산출물**: `lib/api/kma-forecast-core.ts`·`kma-forecast.ts`, `lib/geo/sun-times.ts`, `lib/trails/summary.ts`, `lib/types/{weather,condition,mountain}.ts`, `lib/condition/service.ts`, `components/{loading-bar,weather-icons,hourly-forecast-strip,daily-forecast-list,sun-times-row,trail-summary-bar,trail-difficulty,air-uv-summary,weather-summary-card,trail-list,trail-list-interactive}.tsx`, `lib/trails/parse-knps-csv.ts`, `supabase/seed/trails.sql`, `app/(main)/mountains/[id]/page.tsx`, `tailwind.config.ts` (기존 `air-quality-badge`·`uv-index-badge` 제거)
  - **의존성**: Task 019, Task 023, Task 029

- **✅ Task 035: 계측·모니터링 및 배포 파이프라인 구축** - 완료
  - ✅ **KPI 이벤트 계측(자체 이벤트 테이블)** — `analytics_events`(insert-only RLS, select 차단, PII 미수집)에 익명 `anon_id`(localStorage) 기반 이벤트 적재. `session_start`/`search_session`/`search_result_selected`/`mountain_view`/`favorite_add·remove`/`pwa_prompt_shown`/`pwa_install_accepted·dismissed`/`app_installed` 계측 → 주간 세션·완료율·재방문율·즐겨찾기 비율·PWA 설치 전환율 산출. 클라이언트 로거(`lib/analytics/client.ts`, fire-and-forget)+ 화이트리스트 검증 라우트(`app/api/analytics/route.ts`, search-logs 패턴)
  - ✅ **외부 API 성공률/응답시간 로깅** — 중앙 `withStaleFallback`(lib/api/cache.ts) 1지점에 계측을 얹어 소스별(weather·air·uv) success/stale/failure + 요청 관찰 지연을 `api_logs`에 fire-and-forget 적재(`lib/api/metrics.ts`, 소스 모듈 무수정). 탐방로는 정적 CSV라 대상 제외
  - ✅ **실패 알림 기준 문서화** — 소스별 가용률(success+stale)·신선 성공률(success) 정의와 임계치(주의<98%/경고<95%/위험<90%·p95>8s 15~30분 지속), 목표 1단계 95%→3단계 98%. 실제 알림 채널 연동은 후속 과제로 명시(`docs/operations/monitoring.md`)
  - ✅ **시크릿·보안 점검** — 서버 전용 키의 `NEXT_PUBLIC_` 미노출·`typeof window` 가드 재확인, 신규 테이블 RLS 경고 0건(남은 `auth_leaked_password_protection`은 대시보드 설정, 문서에 활성화 권장 기재)
  - ✅ **CI + 배포 가이드** — GitHub Actions(`.github/workflows/ci.yml`): `typecheck→lint→format:check→build`. `/mountains/[id]` generateStaticParams가 빌드타임에 산 목록을 읽으므로(Cache Components는 빈 결과 불가) publishable(공개) Supabase 자격증명을 저장소 Secrets로 주입. Vercel 배포 절차·환경변수·롤백·시크릿 체크리스트(`docs/operations/deployment.md`). 실제 배포 트리거는 인프라 소유자 수행
  - ✅ **검증** — `typecheck`·`lint`·`format:check`·`build` 통과, Playwright MCP 라이브(지리산)에서 검색→상세 흐름 후 `analytics_events`(5종 이벤트)·`api_logs`(air/uv/weather success) 적재 전수 확인
  - **산출물**: `supabase/migrations/20260809150000_analytics_and_api_logs.sql`, `lib/analytics/client.ts`, `lib/api/metrics.ts`, `app/api/analytics/route.ts`, `components/{analytics-tracker,mountain-view-tracker}.tsx`, 계측 연동(`components/{mountain-search-input,favorite-button,pwa-install-prompt}.tsx`·`app/layout.tsx`·`app/(main)/mountains/[id]/page.tsx`), `.github/workflows/ci.yml`, `docs/operations/{monitoring,deployment}.md`, `lib/supabase/database.types.ts`
  - **의존성**: Task 032, Task 033

### Phase 7: 개인화·콘텐츠 확장 (4단계 후보)

- **✅ Task 036: 100대명산 목록 화면** - 완료
  - ✅ `mountains.is_top100 boolean not null default false` 컬럼 + 부분 인덱스(`mountains_is_top100_idx`) 마이그레이션 적용. 별도 테이블 대신 플래그(단순 필터라 정규화 이득 없음)
  - ✅ 산림청 100대명산(2002) 시드 확장 — 시드 생성기(`gen-mountains.mjs`)에 `is_top100` 필드 추가 + 신규 75종 입력, **총 105종(100대명산 100 + 비대상 5: 남산-서울·북악산·인왕산·수락산·청계산)**. 100대명산 남산(경주)은 서울 남산과 별도 slug로 구분, 동명 산(백운산×3·지리산×2)은 지역 병기로 구분. 좌표는 대표 정상 근사값(격자 5km), roundtrip 자기일관성 105/105 통과. 목록·고도·지역 출처와 라이선스는 `docs/decisions/001-data-sources.md`에 기록(정밀 좌표는 공공데이터 15125127 API로 후속 정밀화 여지)
  - ✅ 전용 **`/top100` 라우트** 신설(홈 섹션 대신 — 100개가 홈 "결론 우선" 위계를 해침). 홈에 진입 배너 링크 추가, `proxy.ts` 공개 경로에 `/top100` 편입
  - ✅ 데이터 계층 `getTop100Mountains()`(`'use cache'` + mountains-1d 프로필 + `is_top100` 필터), UI `components/top100-list.tsx`(클라이언트: 지역 칩 필터·고도 정렬, 데이터 재요청 없음). **목록엔 이름·지역·고도만 노출하고 컨디션 점수 미표시**(100종×외부 API 호출 폭증 방지)
  - ✅ 스켈레톤·`LoadingBar`·`role="status"` 로딩 관례 재사용, 색상 단독 구분 없음, 44px 터치 타깃, 키보드 접근성(aria-pressed)
  - ✅ **테스트**: Playwright(360/768px) — 홈 배너→`/top100`, 100곳 렌더, 경기 필터 14곳(전부 경기 포함), 고도 높은순 정렬(필터 조합 시 화악산 1,468→소요산 588 내림차순), 명지산 카드→상세 **실날씨 정상 연동**(23℃·컨디션 99·일동면 측정소 3.7km — 신규 좌표 검증), 가로 오버플로 0px, 콘솔 에러 0. `typecheck`·`lint`·`build` 통과, DB `is_top100=true` 100건 일치
  - **산출물**: ✅ `supabase/migrations/20260809160000_mountains_top100_flag.sql`, `supabase/seed/{gen-mountains.mjs,mountains.sql}`, `lib/data/mountains.ts`(`getTop100Mountains`), `components/top100-list.tsx`, `app/(main)/top100/page.tsx`, `app/(main)/page.tsx`(배너), `lib/supabase/proxy.ts`(공개 경로), `lib/supabase/database.types.ts`, `docs/decisions/001-data-sources.md`, `docs/tasks/task-036-top100-list.md`
  - **의존성**: Task 014, Task 018

- **✅ Task 037: 방문완료 기록 및 방문 목록 화면** - 완료
  - ✅ DB: **`visited` 테이블**(`user_id`, `mountain_id`, `visited_at`, `note` optional, `(user_id, mountain_id)` 유니크) + 본인만 접근 RLS(select/insert/delete, 즐겨찾기와 동일 패턴). 타입 재생성 완료
  - ✅ 산 상세 화면에 **"방문완료" 토글**(하트 옆, `CircleCheck`·status-open 색): 낙관적 업데이트 + 실패 롤백(`favorite-button` 패턴 재사용). 세션 확인 1회 뒤 즐겨찾기·방문완료 초기 상태를 병렬 조회(`DetailActions`, 두 버튼을 한 액션 슬롯에 배치). 비로그인 클릭 시 로그인 유도 팝오버
  - ✅ **방문완료 목록 화면 `/visited`**: 산 메타 + 방문일(KST `YYYY.MM.DD`)을 즉시 렌더(외부 API 미사용 — 방문 "기록"이라 점수 스트리밍 불필요), `visited_at` 내림차순. 보호 라우트(`proxy.ts` 공개 경로 아님 → 자동 게이트 + 서버 `getClaims()` 이중 방어). 인라인 삭제 낙관적 제거·롤백, 빈 상태 안내. 헤더 네비에 "방문완료" 진입점 추가(Task 038에서 마이페이지로 통합 검토)
  - ✅ **계측**(best-effort): `visited_add`/`visited_remove` 이벤트를 클라이언트 타입·API 화이트리스트·**DB CHECK 제약** 3곳에 함께 추가(CHECK 누락 시 fire-and-forget insert 가 조용히 거부됨을 테스트로 확인 후 마이그레이션으로 해소)
  - ✅ **테스트(Playwright MCP, 지리산)**: 로그인 → 상세 방문완료 토글(버튼 pressed) → `visited` 행 insert 확인 → `/visited` 목록에 방문일과 함께 노출 → 인라인 해제 시 낙관적 제거·빈 상태·DB 행 삭제(0건) 확인, 상세에서 재토글로 `visited_add`·`visited_remove` 계측 적재 각 1건 확인. 콘솔 에러 0. `typecheck`·`lint`·`format:check`·`build` 통과
  - **산출물**: ✅ `supabase/migrations/{20260809170000_visited.sql, 20260809180000_analytics_visited_events.sql}`, `app/api/visited/route.ts`, `components/{visited-button,visited-list,visited-list-skeleton}.tsx`, `app/(main)/visited/page.tsx`, 상세 페이지 액션 통합(`app/(main)/mountains/[id]/page.tsx`), 헤더 네비(`components/auth-button.tsx`), 계측(`lib/analytics/client.ts`·`app/api/analytics/route.ts`), `lib/supabase/database.types.ts`
  - **의존성**: Task 019, Task 025, Task 026

- **✅ Task 038: 마이페이지(개인화 허브)** - 완료
  - ✅ 로그인 사용자용 **`/mypage`** 화면: 프로필 요약(이니셜 아바타 + 표시이름[실명→username→이메일 local 폴백] + 이메일) + **즐겨찾기·방문완료 진입 카드(개수 배지)** + 프로필 편집(`/protected/profile`) + 로그아웃. 개수는 `head+count` 병렬 조회(RLS 로 본인 행만 집계)
  - ✅ **헤더 네비 통합**: 기존 즐겨찾기·방문완료 **직접 링크 2개를 마이페이지 단일 진입점으로 통합**(개인화 화면이 늘수록 헤더가 비좁아지는 문제 해소). 로그인 시 마이페이지+로그아웃, 비로그인 시 로그인만 노출. 즐겨찾기·방문완료는 `/mypage` 안에서 진입. SiteHeader Suspense 폴백 폭도 새 컨트롤에 맞춤(CLS)
  - ✅ 보호 라우트: `proxy.ts` 공개 경로가 아니라 자동으로 `/auth/login?next=/mypage` 게이트 + 서버 `getClaims()` 이중 방어. 진입 카드는 `MypageNavCard` 순수 표현 컴포넌트로 향후 개인화 화면 확장 대비. 스켈레톤·`LoadingBar`·`aria-busy` 로딩 관례 재사용
  - ✅ **테스트(Playwright MCP)**: 로그인(next=/mypage 복귀) → 헤더 마이페이지 링크 → 허브에서 즐겨찾기 2·방문완료 1 배지 정확 표시 → 로그아웃 시 헤더 로그인만 노출 → 비로그인 `/mypage` 접근 시 `?next=%2Fmypage` 로그인 유도 확인. 콘솔 에러 0, `typecheck`·`lint`·`build` 통과
  - **산출물**: ✅ `app/(main)/mypage/page.tsx`, `components/mypage-nav-card.tsx`, 헤더 통합(`components/auth-button.tsx`·`components/site-header.tsx`)
  - **의존성**: Task 026, Task 037

#### 개선(비순번)

- **✅ 홈 컨디션 중심 재구성** - 완료
  - 기존 "인기 산" 그리드가 검색 로그 부족 시 **이름 가나다순 백필**이라 사실상 임의로 배치됐고(라벨-데이터 불일치), 카드에 판단 신호(컨디션)가 없어 홈이 "결론 우선" 위계를 살리지 못하던 문제를 해소
  - **모든 산 카드에 오늘 컨디션 점수 칩**을 얹어 검색 전에도 "지금 갈 만한지"를 판단하게 함(`ConditionChip` 공용 컴포넌트로 추출 — 즐겨찾기 화면·홈 블록 공유)
  - **문맥 적응형 위계**: 검색 → 내 산 오늘 컨디션(로그인+즐겨찾기, 카드별 스트리밍) → 최근 검색 → 지금 갈 만한 산(모든 사용자) → 100대명산
  - **"지금 갈 만한 산"**: 후보 풀(소수)의 오늘 컨디션을 계산해 **점수순 정렬**, 콜드스타트 백필을 이름순 대신 **대표 산 큐레이션**(북한산·설악산·지리산·한라산…)으로 채워 친숙한 산이 노출되게 함(`getPopularMountainsGeo`, 좌표 포함). 검색 로그가 쌓이면 자동으로 실인기 반영
  - 각 컨디션 블록은 독립 `<Suspense>` 스트리밍이라 히어로·검색은 즉시 렌더(홈 PPR 유지). 로그인/로그아웃·큐레이션 풀 Playwright 검증, `typecheck`·`lint`·`build` 통과
  - **산출물**: `components/{condition-chip,home-mountain-card,home-conditions-skeleton,home-favorite-conditions,today-condition-picks}.tsx`, `lib/data/mountains.ts`(`getPopularMountainsGeo`+큐레이션), `app/(main)/page.tsx`, `components/favorite-score.tsx`(공용 칩 재사용). 구 `components/popular-mountains.tsx`·`getPopularMountains` 제거
  - **속도 개선(후속)**: "지금 갈 만한 산"이 정렬을 위해 후보 8곳×(날씨·대기·자외선) 최대 24개 외부호출을 **모두 기다린 뒤** 렌더돼 로그아웃 첫 방문(콜드 캐시)에서 체감이 느리던 문제를 해소. **엄격한 컨디션순 정렬을 포기**하고 큐레이션 4곳을 이름·지역·고도로 **즉시 렌더**(값싼 `'use cache'` DB → 정적 셸에 포함, 홈 revalidate 1h), 컨디션 칩만 카드별 `<Suspense>` 로 스트리밍(`FavoriteScore` 재사용). 동명 산(지리산 1,915m vs 399m)은 **가장 높은 산을 대표로** 합쳐 유명한 쪽을 노출. 외부호출 8→4곳, 부제도 "오늘 컨디션을 확인해 보세요"로 정직화. Playwright 로 정적 셸에 카드 4곳 즉시 포함·칩 스트리밍·지리산 1,915m 확인

- **✅ 로그인 후 착지 지점 마이페이지 통일** - 완료
  - 인증 성공 후 기본 목적지를 `/favorites`→`/mypage`(개인 허브)로 통일. 명시적 `?next=`(보호 라우트 복귀)는 보존. 로그인 폼·로그인 페이지 `safeNext`·OAuth 콜백·비밀번호 재설정·회원가입 이메일 확인·GoogleAuthButton 기본값, 로그인 안내 문구 갱신

- **✅ 프로필 편집 화면 구성** - 완료
  - **선결 문제 발견·해소**: 스타터의 `profiles` 마이그레이션이 이 프로젝트에 **적용된 적이 없어**(원격에 테이블·트리거 부재, 커밋된 타입만 잔존) 기존 `/protected/profile` 이 사실상 동작하지 않던 상태. `profiles` 테이블·RLS·자동생성 트리거·백필을 **새로 정의**(미적용 orphan 마이그레이션 삭제·통합)
  - **확장 속성**: 이름(full_name)·닉네임(username, unique)·**프로필 아이콘(avatar_icon, 프리셋 이모지 선택)**·자기소개(bio, 160자)·**가장 좋아하는 산(favorite_mountain_id → mountains FK)**·주 활동 지역(home_region)·등산 경력(experience_level: 입문/중급/고급). 아바타는 사용자 결정대로 **이미지 업로드/URL 없이 프리셋 아이콘 선택**, 프로필은 **본인만 조회**(공개 프로필 없음)
  - `/mypage/profile`(보호 라우트, `(main)` 레이아웃으로 이관) + 클라이언트 폼(upsert, 닉네임 중복 23505 친절 처리, 아이콘 피커 `aria-pressed`). 마이페이지 요약 아바타를 이니셜→**선택 아이콘** 우선 표시. 구 `/protected/profile`·`profile-form.tsx` 제거
  - **보안**: 트리거 함수 2종 `search_path` 고정 + `PUBLIC` EXECUTE 회수(린트 0011/0028/0029 해소). 남은 경고는 대시보드 설정인 유출 비밀번호 보호뿐
  - **테스트(Playwright MCP)**: 로그인(next=/mypage/profile) → 아이콘·이름·닉네임·자기소개·좋아하는 산·지역·경력 입력 → 저장 → DB 전 필드 반영 확인 → 마이페이지 아바타 ⛰️·이름 반영 → 재진입 시 저장값 라운드트립(아이콘 pressed·select selected) 확인. 콘솔 에러 0, `typecheck`·`lint`·`build` 통과
  - **마이페이지 요약 확장(후속)**: 요약 카드에 **자기소개(전문)·가장 좋아하는 산(상세 링크 칩)·등산 경력(칩)**을 추가 노출. 좋아하는 산 이름은 `favorite_mountain_id` **FK 임베드**로 프로필과 함께 한 번에 조회(별도 쿼리 없음), to-one 임베드의 배열/객체 형태를 정규화 처리. 값 없는 항목은 미렌더, 스켈레톤도 늘어난 카드 높이에 맞춤(CLS). Playwright 로 3항목 렌더·최애 산 상세 링크 확인
  - **산출물**: `supabase/migrations/20260809190000_profiles.sql`, `lib/profile/profile-options.ts`, `components/profile-edit-form.tsx`, `app/(main)/mypage/profile/page.tsx`, 마이페이지 아바타·요약·링크(`app/(main)/mypage/page.tsx`), `lib/supabase/database.types.ts`

