# 로드맵 — Phase 0~2 (기반 구축)

> [← ROADMAP 허브](../ROADMAP.md) · 착수 전 의사결정 → 애플리케이션 골격 → UI/UX 완성 (Task 001~013).
> 상태 표기 규칙·개발 워크플로우·Phase↔PRD 매핑은 허브를 참조하세요.

### Phase 0: 착수 전 의사결정 및 데이터 소스 검증

> PRD 9장 "확정 필요 항목(🔶)" 15건을 해소하는 단계. **특히 #4(탐방로 데이터 소스)와 #15(등산로 GeoJSON)는 미확정 시 각각 1단계 Must 기능과 3단계 전체 스코프가 흔들리는 최대 리스크 항목**이므로 최우선 검증한다.

- **Task 001: 외부 데이터 소스 실현성 검증(PoC)** - 진행중 (데이터 소스 확보 + 기상·대기·자외선 3종 라이브 검증 완료 / 잔여: 일일 호출 한도 기록)
  - ✅ 🔶#4 **탐방로 개방정보 소스 확보** — **국립공원공단 데이터(`mountain.csv`, 625코스 / 22개 사무소) 채택**. `탐방로 통제여부` + `통제구간 설명`(계절 산불통제 기간 포함) 보유 → 오늘 날짜와 비교해 통제 여부 계산. 정적 2023 스냅샷이라 돌발 통제는 폴백, 국립공원 외 산은 "정보 없음" 폴백(정식 스펙)
  - ✅ 🔶#15 **등산로 GeoJSON 확보 (PoC 통과)** — `mountain.csv`가 **WGS84 위경도 좌표**를 담고 있어 재투영 없이 GeoJSON 변환 성공(수통골 코스로 검증). Task 029 폴리라인 오버레이 **정식 구현 확정**(축소안 불요)
  - ✅ 🔶#3 기상청 API 종류 확정 — **초단기실황/초단기예보 + 단기예보 혼용**(당일 D-0 초단기, 익일 이후 단기)
  - ✅ 🔶#5 미세먼지 측정소 매핑 규칙 확정 — **위경도 최근접 측정소 + 거리 임계값**(초안 20km, 초과 시 "인근 측정소 없음" + 점수 제외)
  - ✅ 🔶#6 자외선 API 확정 — **기상청 생활기상지수 조회서비스 V5 `getUVIdxV5`**, 지역코드(`areaNo`) 매핑. **라이브 정상 확인**(직전 코드30은 V4 엔드포인트 오류였음)
  - ✅ 공공데이터포털 API 키 발급(기상청 단기예보·에어코리아·생활기상지수) 완료 — 3종 라이브 호출 정상 검증(`.env.local`: `KMA_SERVICE_KEY`·`AIRKOREA_SERVICE_KEY`·`KMA_LIVING_INDEX_KEY`, 계정당 1키 동일 값)
  - ⏳ 각 서비스 일일 호출 한도(트래픽 쿼터) 기록 — 결정 003 캐싱 TTL 설계 근거용
  - **산출물**: ✅ `docs/decisions/001-data-sources.md`, ✅ 등산로 GeoJSON 변환 PoC(`scratchpad/sutong_course.geojson`), ✅ 기상·대기·자외선 샘플 응답 JSON(`scratchpad/api-retest-result.json`)
  - **의존성**: 없음 (모든 Phase의 선행 조건)

- **✅ Task 002: 제품 정책 및 라우팅 구조 확정** - 완료
  - ✅ 🔶#1 제품 영문/브랜드명 확정 — **SanGil**(국문 "산길날씨" → 이후 UI 리브랜딩으로 **"산길정보"**), 대안 TrailCast 미채택
  - ✅ 🔶#2 검색 결과 라우트 구조 확정 — **`/mountains/[id]` 상세 직결**(`/search?q=` 미채택), 동명 산은 자동완성 지역 병기로 구분
  - ✅ 🔶#12 비로그인 정책 확정 — 1단계 전면 비로그인, 2단계 즐겨찾기부터 로그인 (`proxy.ts` 공개 `/`·`/mountains/*`·`/offline`, 보호 `/favorites`)
  - ✅ 🔶#14 `search_logs` 수집 여부 결정 — **활성화(insert-only 익명 로깅, 개인정보 미수집)**, 처리방침 1줄 고지
  - ✅ 🔶#7 산-격자좌표 사전 적재 방식 확정 — **초기 시드 배치**(시드 시 위경도→격자 일괄 변환)
  - **산출물**: ✅ `docs/decisions/002-product-policy.md`(확정 라우트 표 포함)
  - **의존성**: Task 001 (#7은 기상청 API 종류 확정 후 결정)

- **✅ Task 003: 캐싱 전략 및 점수 알고리즘 기준 확정** - 완료
  - ✅ 🔶#8 캐싱/갱신 주기 확정 — 실측 발표주기 정렬: 날씨(D-0) 30분 / 단기예보 3시간 / 대기질 1시간 / 자외선 3시간 / 탐방로 6시간 (v1, Task 032 재튜닝)
  - ✅ 🔶#9 캐싱 구현 방식 확정 — **역할 분담**: 외부 API 응답은 Next `"use cache"`+`cacheLife`, 계산 점수는 `condition_scores` 테이블
  - ✅ 🔶#10 점수 계산 위치/버전관리 확정 — 서버 유틸(`lib/condition/score.ts`)에서만 계산, `calc_version="v{n}"` 태깅·증가 규칙 정의
  - ✅ 🔶#11 컨디션 점수 가중치 초기값 동결 — PRD 4.2 표를 v1으로 고정(감점표·등급구간), 튜닝은 문서 개정+버전 증가로만
  - ✅ 🔶#13 PWA 캐싱 전략 확정 — 앱 셸 precache(cache-first) + 데이터 network-first(캐시 폴백), 손수 작성 `public/sw.js`
  - ✅ 🔶 RLS 정책 확정 — `mountains`/`trails` 공개 select·서비스롤 쓰기, `favorites` `auth.uid()`, `condition_scores` 공개 select·서비스롤 쓰기, `search_logs` insert-only·select 차단
  - **산출물**: ✅ `docs/decisions/003-caching-scoring.md`(캐시 키·TTL 표·RLS 표 포함)
  - **의존성**: Task 001

---

### Phase 1: 애플리케이션 골격 구축

- **✅ Task 004: 스타터킷 정리 및 프로젝트 기반 설정** - 완료
  - ✅ 스타터 잔존물 제거 — `components/tutorial/*`, `hero.tsx`, `next-logo.tsx`, `supabase-logo.tsx`, `deploy-button.tsx` 삭제. `app/page.tsx`는 최소 SanGil 플레이스홀더로 교체(정식 홈은 Task 005/009), `app/protected/*`는 스타터 흔적만 제거·인증 구조 보존(리다이렉트 경로 정비는 Task 025)
  - ✅ `app/layout.tsx` 메타데이터 교체 — 산길날씨 title 템플릿·description·OG(ko_KR)·`applicationName: SanGil`, `viewport`(device-width·viewportFit cover·themeColor), `lang="ko"`
  - ✅ `lib/env.ts` 검증 유틸 — 서버 전용 `serverEnv`(`KMA_SERVICE_KEY`·`AIRKOREA_SERVICE_KEY`·`KMA_LIVING_INDEX_KEY`, 지연 평가 throw), `publicEnv`(카카오맵, Phase 5), `.env.local.example` 작성. **`TRAIL_API_KEY`는 정적 CSV 채택으로 불필요(결정 001 #4) → 제외**
  - ✅ `docs/guides/*` 규약 준수 — `@/*` 별칭, kebab-case 파일명, PascalCase 컴포넌트명. `npm run typecheck`·`lint`·`build` 통과 확인
  - **산출물**: ✅ `app/layout.tsx`, ✅ `lib/env.ts`, ✅ `.env.local.example`
  - **의존성**: Task 002

- **✅ Task 005: 라우트 구조 및 공통 레이아웃 골격 구현** - 완료
  - ✅ App Router 전체 라우트 스캐폴딩 — 라우트 그룹 `app/(main)/`에 홈(`page.tsx`)·상세(`mountains/[id]/page.tsx`)·지도(`mountains/[id]/map/page.tsx`)·즐겨찾기(`favorites/page.tsx`) 배치, `/offline`은 그룹 밖 독립 배치
  - ✅ 산 상세 라우트에 `loading.tsx`(스켈레톤)·`error.tsx`(재시도, useEffect 로깅)·`not-found.tsx` 껍데기 생성
  - ✅ 모바일 우선 공통 레이아웃 골격 — `components/site-header.tsx`(로고+테마 스위처, sticky) + `(main)/layout.tsx` 최대폭 컨테이너(`max-w-screen-sm`). **하단 네비는 즐겨찾기 활성화 시점(Task 025)으로 연기**(1단계 목적지 홈뿐)
  - ✅ `proxy.ts` 보호 경로 재정의 — 쿠키 처리 로직 불변, 공개 경로 화이트리스트(`/`·`/mountains/*`·`/offline`·`/auth*`·`/login*`)로 전환. `/favorites` 미인증 시 `/auth/login` 리다이렉트 확인
  - ✅ `params` 비동기 시그니처 적용(상세·지도, `await params`) — Next.js 16 규약
  - ✅ Playwright MCP 스모크 테스트(360px) — 홈·상세·지도·오프라인 렌더 + `/favorites`→`/auth/login` 리다이렉트, 콘솔 에러 0건. `typecheck`·`lint`·`build` 통과
  - **산출물**: ✅ `app/(main)/*`, `app/offline/page.tsx`, `components/site-header.tsx`, `lib/supabase/proxy.ts`
  - **의존성**: Task 002, Task 004

- **✅ Task 006: 도메인 타입 및 API 표준 스키마 정의** - 완료
  - ✅ 도메인 타입 — `mountain.ts`(Mountain, Trail, TrailStatus + 라벨맵), `weather.ts`(WeatherSnapshot: TMP/POP/SKY/PTY/WSD/REH + SKY/PTY 코드→시맨틱 매핑), `air.ts`(AirQuality, UvIndex + 등급 매핑·UV 구간)
  - ✅ 컨디션 점수 타입 — `condition.ts`(ConditionScore, ScoreBreakdownItem, ScoreGrade, GearItem, ScoreFactor + 등급 구간·라벨, 결정 003 v1 동결값 반영)
  - ✅ 정규화 계약 — `Normalizer<TOut>` 시그니처(파싱 실패 시 throw 대신 failure 반환), 부분 실패 `PartialResult<T>`(success/stale/failure + `fetchedAt`) + `hasData` 가드
  - ✅ Route Handler 공통 응답 — `ApiResponse<T>`(ok/partial/error, `fetchedAt`·`issues`), `ApiError`/`ApiErrorCode`(no_station·not_covered 등 폴백 분기 포함)
  - ✅ 상세 집계 스키마 `MountainDetailData`(소스별 PartialResult 격리) + 배럴 `index.ts`. `typecheck`·`lint` 통과
  - **산출물**: ✅ `lib/types/{api,mountain,weather,air,condition,index}.ts`
  - **의존성**: Task 001

- **✅ Task 007: Supabase 스키마 설계 및 마이그레이션 작성 (적용 제외)** - 완료
  - ✅ `mountains` DDL — uuid PK, name/region/altitude(nullable)/lat/lng/grid_nx/grid_ny, **name 트라이그램 GIN 인덱스**(pg_trgm, extensions 스키마)
  - ✅ `trails` DDL — mountain_id FK(cascade), name, `status` check(open/closed/partial/unknown = TrailStatus), closed_reason, closed_period, path_geojson(jsonb nullable, 3단계용), mountain_id 인덱스
  - ✅ `favorites` DDL — user_id FK(auth.users), mountain_id FK, `(user_id, mountain_id)` 유니크, user_id·mountain_id 인덱스
  - ✅ `condition_scores` DDL — score check(0~100), grade check(ScoreGrade), breakdown(jsonb), calc_version, `(mountain_id, calc_version, computed_at desc)` 조회 인덱스
  - ✅ `search_logs` DDL — query, mountain_id(nullable, on delete set null) + 인덱스
  - ✅ RLS 정책 SQL(멱등) — mountains/trails/condition_scores 공개 select·쓰기 차단, favorites `(select auth.uid())=user_id` select/insert/delete, search_logs insert-only·select 차단. 인덱스 없는 FK 보완(advisor 0건 목표)
  - **산출물**: ✅ `supabase/migrations/20260808120000_sangil_core_schema.sql`, `20260808120100_sangil_rls.sql` (**작성만 — 적용·타입 재생성은 Task 014**)
  - **의존성**: Task 003 (RLS 정책 확정), Task 006

---

### Phase 2: UI/UX 완성 (더미 데이터 활용)

> 이 Phase는 외부 API 없이 하드코딩 더미 데이터만으로 전 화면을 완성한다. Phase 3～5의 백엔드 작업과 병렬 진행 가능하다.

- **✅ Task 008: 디자인 토큰 및 공통 컴포넌트 라이브러리 구축** - 완료
  - ✅ 아웃도어 톤 색상 토큰 추가 — `app/globals.css`의 `:root`/`.dark` HSL 변수와 `tailwind.config.ts`의 `theme.extend.colors` **동시** 수정 (상태색 4종 `--status-open/closed/partial/unknown` + 등급색 5종 `--grade-excellent~dangerous`, 다크모드 명도 상향)
  - ✅ shadcn/ui 프리미티브 추가 — `command`(자동완성)·`skeleton`·`alert`·`tabs`·`sheet`·`separator`·`progress` (+의존성 `dialog`), 프로젝트 HSL 토큰 방식 정합 확인
  - ✅ 상태 표시 공통 컴포넌트 — `components/trail-status-badge.tsx` (색상 단독 구분 금지: 상태별 아이콘 + `TRAIL_STATUS_LABEL` 병기, sm/md 사이즈)
  - ✅ 로딩/에러 공통 컴포넌트 — `result-skeleton.tsx`(상세 골격 스켈레톤·`aria-busy`), `error-fallback.tsx`(`ApiError.message` + 재시도 버튼), `stale-data-notice.tsx`("N분 전 기준", 마운트 후 계산으로 하이드레이션/캐시 오염 회피)
  - ✅ 더미 데이터 유틸 — `lib/mock/{mountains,weather,condition}.ts` + `index.ts` 배럴(`getMockMountainDetail`로 `MountainDetailData` 조합, 한라산 대기질 `no_station` 등 부분 실패 재현), Task 006 타입 준수
  - ✅ `typecheck`·`lint` 통과
  - **산출물**: ✅ `components/ui/*`, ✅ `components/{trail-status-badge,result-skeleton,error-fallback,stale-data-notice}.tsx`, ✅ `lib/mock/*`
  - **의존성**: Task 006

- **✅ Task 009: 홈/검색 화면 UI 구현** - 완료
  - ✅ `MountainSearchInput` 구현 — cmdk 자동완성 드롭다운(더미 후보, 지역명 병기로 동명 산 구분·결정 002 #2), 키보드 내비(↑/↓/Enter/Esc)·combobox ARIA, 44px 이상 터치 타깃, 선택 시 `/mountains/[id]` 직결
  - ✅ 최근 검색 기록 UI — `useRecentSearches`(`localStorage` + `useSyncExternalStore`로 하이드레이션 안전·동일 탭 동기화, 최대 8건), 칩 목록 + 개별/전체 삭제
  - ✅ 인기 산 목록 카드 그리드 — 더미(`POPULAR_MOUNTAINS`), 360px 2열 유지
  - ✅ 빈 상태/검색 결과 없음 UI, 자동완성 디바운스 로딩 스켈레톤
  - ✅ 360px 폭 레이아웃 검증(Playwright MCP: 자동완성·결과없음·상세이동·최근기록·삭제 정상, 콘솔 에러 없음), `typecheck`·`lint`·`build` 통과
  - **산출물**: ✅ `app/(main)/page.tsx`, ✅ `components/mountain-search-input.tsx`, ✅ `components/recent-searches.tsx`, ✅ `components/popular-mountains.tsx`, ✅ `hooks/use-recent-searches.ts`
  - **의존성**: Task 005, Task 008

- **✅ Task 010: 산 상세 결과 화면 UI 구현 (1단계 범위)** - 완료
  - ✅ `WeatherSummaryCard` — 하늘 아이콘+기온 히어로 + 강수확률/강수형태/풍속/습도 4메트릭(아이콘 + 수치 병기), `PartialResult` 성공/stale/실패 격리
  - ✅ `TrailStatusBadge` 배치 및 탐방로 목록 섹션(`TrailList`) — 개방/통제/부분통제/정보없음 구분, 통제 사유·기간 표시
  - ✅ `MountainDetail` — 산 이름·지역·고도 메타 섹션
  - ✅ 페이지 상단 "결론 우선" 정보 위계 구성(메타 → 날씨 히어로 → 탐방로)
  - ✅ 부분 실패 표현 UI — 날씨만 실패 / 탐방로만 실패 / "정보 없음" 각 케이스(소스별 격리 렌더, Playwright 검증)
  - ✅ 상세 라우트 `loading.tsx`→`ResultSkeleton`, `error.tsx`→`ErrorFallback`(reset→재시도) 연결. `typecheck`·`lint`·`build` 통과
  - **산출물**: ✅ `app/(main)/mountains/[id]/page.tsx`, ✅ `components/weather-summary-card.tsx`, ✅ `components/mountain-detail.tsx`, ✅ `components/trail-list.tsx`
  - **의존성**: Task 005, Task 008

- **✅ Task 011: 컨디션 점수 및 장비 추천 UI 구현 (2단계 범위)** - 완료
  - ✅ `ConditionScoreGauge` — 0～100 원형 게이지(SVG), **등급·메시지 텍스트 병기 필수**(색상 단독 금지), `--grade-*` 토큰을 `currentColor`로 링/텍스트 일관 적용, `role="img"` 접근성 라벨
  - ✅ `ScoreBreakdown` — 주요 감점 요인 2～3개 리스트("강수확률 70% −20" 형식), `excludedVariables` 존재 시 "일부 데이터 제외" 배지
  - ✅ `GearRecommendationList` — 조건별 장비 카드 목록, 발동 근거 문구 병기, 빈 목록 폴백
  - ✅ `AirQualityBadge`(PM10/PM2.5 값+등급 텍스트 병기·측정소/거리), `UvIndexBadge`(UV 값+구간 라벨)
  - ✅ `FavoriteButton` UI — 비활성/활성 토글(`aria-pressed`), 비로그인 시 로그인 유도 팝오버(결정 002 #12)
  - ✅ 상세 페이지 "결론 우선" 위계 통합(메타 → 점수 히어로 → 감점 근거 → 날씨 → 대기·자외선 → 장비 → 탐방로), 부분 실패(한라산 대기질 측정소 부재) 격리 렌더
  - **산출물**: ✅ `components/condition-score-gauge.tsx`, `components/score-breakdown.tsx`, `components/gear-recommendation-list.tsx`, `components/air-quality-badge.tsx`, `components/uv-index-badge.tsx`, `components/favorite-button.tsx`, `app/(main)/mountains/[id]/page.tsx`(통합)
  - **의존성**: Task 008, Task 010

- **✅ Task 012: 즐겨찾기·지도·오프라인 화면 UI 구현 (2～3단계 범위)** - 완료
  - ✅ `/favorites` — 저장한 산 카드 목록(요약 컨디션 점수 칩: 점수+등급 텍스트 병기), 빈 상태·비로그인 안내 UI. `cacheComponents` 규약 준수로 `searchParams` 접근부를 `<Suspense>` 분리, Phase 2 검증용 `?state=empty`·`?state=guest` 지원(Task 026 실데이터 시 세션·목록 유무로 대체). 라우트는 proxy 보호라 비로그인 시 `/auth/login` 리다이렉트(의도된 동작, 시각 검증은 인증 활성화 Task 025로 연기)
  - ✅ `/mountains/[id]` 지도 섹션 자리표시자 + `MapLegend`(색상 점+상태 아이콘+라벨 3중 병기, 색상 단독 구분 금지) + 전체화면 링크
  - ✅ `/mountains/[id]/map` 전체화면 지도 레이아웃 골격 — 뒤로가기·산 이름 타이틀·풀높이(70dvh) 지도 자리표시자·범례 오버레이
  - ✅ `/offline` 네트워크 단절 안내 화면(WifiOff 아이콘·홈 CTA), `PwaInstallPrompt` 하단 고정 배너 UI를 `(main)` 레이아웃 전역 마운트(닫기 상태만 담당, 실제 `beforeinstallprompt` 트리거는 Task 030)
  - ✅ `MapLegend`는 상태 목록 prop 지원(지도/상세는 개방·부분통제·통제 3종 노출), `safe-area-inset` 대응
  - ✅ Playwright MCP 스모크(360px): 상세 지도 섹션·범례·PWA 배너·전체화면 지도·오프라인 렌더, `/favorites`→`/auth/login` 리다이렉트, 콘솔 에러 0건. `typecheck`·`lint`·`build` 통과
  - **산출물**: ✅ `app/(main)/favorites/page.tsx`, ✅ `app/(main)/mountains/[id]/map/page.tsx`, ✅ `app/offline/page.tsx`, ✅ `components/map-legend.tsx`, ✅ `components/pwa-install-prompt.tsx`, ✅ `app/(main)/mountains/[id]/page.tsx`(지도 섹션 추가), ✅ `app/(main)/layout.tsx`(배너 마운트)
  - **의존성**: Task 005, Task 008

- **✅ Task 013: 반응형·접근성 기준 검증** - 완료
  - ✅ 360/390/768/1024px 뷰포트 검사 — 전 뷰포트 가로 오버플로 0px, `main` 640px(`max-w-screen-sm`) 캡 유지 확인
  - ✅ 터치 타깃 44×44px 전수 검사 → **5건 위반 수정**(헤더 로고·테마 스위처·상세 전체화면 링크·PWA 설치/닫기·지도 뒤로가기)
  - ✅ 접근성 이름 점검 → **테마 스위처 무명 버튼**에 `aria-label="테마 변경"` 추가. 검색 입력은 `combobox` role·라벨 완비(Task 009), 상세 제목 위계(h1→h2→h3) 스킵 없음 확인
  - ✅ **키보드 포커스 링 전역 미표시(WCAG 2.4.7) 발견·수정** — Tailwind v4+v3 하이브리드에서 shadcn `focus-visible:ring-*` 유틸이 CSS 미생성 → `app/globals.css`에 unlayered `:focus-visible` 아웃라인 추가로 `!important` 없이 전역 포커스 가시성 보장. Tab 이동·포커스 렌더 검증
  - ✅ 색상 단독 구분 금지 준수(탐방로 상태·컨디션 등급·지도 범례 모두 아이콘/텍스트 병기), 다크모드 대비 확인(상태/등급색 명도 상향)
  - ✅ Playwright MCP 스모크(360px 홈·상세·지도·오프라인) 앱 콘솔 에러 0건. `typecheck`·`lint`·`build` 통과
  - ⚠️ **잔여(범위 밖)**: `/favorites` 화면 내부·`app/auth/*` 폼 터치 타깃은 인증 활성화 **Task 025**에서 정비(로그인 폼 라벨은 존재해 a11y 충족)
  - **산출물**: ✅ `docs/test-reports/phase2-a11y-responsive.md`, 수정 커밋(`app/globals.css`·`components/theme-switcher.tsx`·`components/site-header.tsx`·`components/pwa-install-prompt.tsx`·`app/(main)/layout.tsx`·상세/지도 page)
  - **의존성**: Task 009, Task 010, Task 011, Task 012

