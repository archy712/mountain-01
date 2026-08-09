# 산길정보(SanGil) 개발 로드맵

산 이름 하나로 "지금 이 산에 가도 되는지"를 3초 안에 판단하게 해주는 등산 날씨·탐방로 통합 모바일 웹 앱

## 개요

산길정보는 **주말/휴일 산행을 계획하는 일반 등산객**을 위한 **출발 전 의사결정 도구**로 다음 기능을 제공합니다:

- **산 검색 + 오늘 날씨**: 산 이름 자동완성 → 기온·강수확률·하늘상태·풍속을 한 화면 요약 (1단계)
- **탐방로 개방 여부**: 개방/통제/부분통제 상태를 아이콘+텍스트 배지로 즉시 확인 (1단계)
- **등산 컨디션 점수 + 장비 추천**: 날씨·미세먼지·자외선을 0～100 점수와 등급으로 압축하고 조건별 준비물 제시 (2단계)
- **지도 + PWA**: 카카오맵 등산로 폴리라인 시각화, 홈 화면 설치 및 오프라인 폴백 (3단계)

### 기술 스택 (PRD 확정)

| 영역        | 스택                                                                                  |
| ----------- | ------------------------------------------------------------------------------------- |
| 프레임워크  | Next.js 16 App Router (`proxy.ts`, `cacheComponents: true`)                           |
| 백엔드/인증 | Supabase (`@supabase/ssr`, 쿠키 세션, `getClaims()` 관례)                             |
| 스타일      | Tailwind CSS v4 + shadcn/ui (`new-york`), `tailwind.config.ts` + `@config` 하이브리드 |
| 지도        | 카카오맵 JS SDK (3단계)                                                               |
| 외부 API    | 기상청 단기예보·생활기상지수(자외선), 에어코리아 대기오염정보 (탐방로·등산로는 국립공원공단 CSV 적재) |
| 배포 형태   | 모바일 웹 우선 반응형 → PWA (3단계)                                                   |

### 현재 코드베이스 기준선

- Supabase Auth 스타터킷 상태 (`app/auth/*` 로그인·회원가입·비밀번호 재설정, `app/protected/*`, `components/tutorial/*` 잔존)
- `supabase/migrations/20260808000000_profiles_handle_new_user.sql` 만 존재 (도메인 테이블 없음)
- `src/` 없이 루트 `app/`, `components/`, `lib/` 배치, 경로 별칭 `@/*` → 루트

---

## 개발 워크플로우

1. **작업 계획**

- 기존 코드베이스를 학습하고 현재 상태를 파악
- 새로운 작업을 포함하도록 `docs/ROADMAP.md` 업데이트
- 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**

- 기존 코드베이스를 학습하고 현재 상태를 파악
- 고수준 명세서, 관련 파일, 수락 기준, 구현 단계 포함
- **API/비즈니스 로직 작업 시 "## 테스트 체크리스트" 섹션 필수 포함 (Playwright MCP 테스트 시나리오 작성)**
- 새 작업 문서에는 빈 체크박스만 두고 변경 사항 요약은 작성하지 않음

3. **작업 구현**

- 작업 파일의 명세서를 따름
- 기능과 기능성 구현
- **외부 API 연동 및 점수/추천 비즈니스 로직 구현 시 Playwright MCP로 테스트 수행 필수**
- 스키마 변경 시 `mcp__supabase__generate_typescript_types`로 `lib/supabase/database.types.ts` 재생성
- 각 단계 후 작업 파일 내 단계 진행 상황 업데이트
- 구현 완료 후 Playwright MCP를 사용한 E2E 테스트 실행
- 테스트 통과 확인 후 다음 단계로 진행, 각 단계 완료 후 중단하고 추가 지시를 대기

4. **로드맵 업데이트**

- 로드맵에서 완료된 작업을 ✅로 표시

### 상태 표기 규칙

| 표기         | 의미                    |
| ------------ | ----------------------- |
| `- 우선순위` | 즉시 착수 대상          |
| `- 진행중`   | 작업 진행 중            |
| `✅ - 완료`  | 완료                    |
| 표기 없음    | 대기 (선행 작업 미완료) |

### Phase ↔ PRD 단계 매핑

| Phase   | PRD 대응      | 목표                                                 |
| ------- | ------------- | ---------------------------------------------------- |
| Phase 0 | 착수 전 결정  | 🔶 확정 필요 항목 15건 해소, 데이터 소스 실현성 검증 |
| Phase 1 | 공통          | 라우트·타입·스키마 골격 구축                         |
| Phase 2 | 공통          | 더미 데이터로 전 화면 UI 완성                        |
| Phase 3 | **1단계 MVP** | 날씨 + 탐방로 실데이터 연동                          |
| Phase 4 | **2단계**     | 컨디션 점수 + 장비 추천 + 인증/즐겨찾기              |
| Phase 5 | **3단계**     | 지도 + PWA                                           |
| Phase 6 | 공통          | 성능·접근성·운영 품질 확보                           |
| Phase 7 | 4단계 후보    | 개인화(방문완료·마이페이지)·콘텐츠(100대명산) 확장   |

---

## 개발 단계

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

---

### Phase 3: 1단계 MVP 핵심 기능 구현 (날씨 + 탐방로)

- **✅ Task 014: DB 마이그레이션 적용 및 산 마스터 시드 적재** - 완료
  - ✅ Task 007 마이그레이션 `apply_migration` 적용 (core schema → RLS 순) — 원격 DB 반영, 5개 테이블 전부 RLS 활성 확인
  - ✅ 산 마스터 시드 30종 구축·적재 — 국립공원(산악형) + 주요 근교/도립산(이름·지역·고도·위경도), `mountains` 적재. id 는 결정론적 UUID v5(slug 기반)로 재실행 멱등
  - ✅ **위경도 → 기상청 격자(nx, ny) 변환 유틸**(`lib/geo/kma-grid.ts`, 기상청 공식 DFS/LCC 식) 구현 + 시드 시 `grid_nx`/`grid_ny` 사전 적재(🔶#7). **단위 검증**: 공식 예시 좌표(서울 60/127·제주 53/38) 재현 + 30종 roundtrip 격자 자기일관성 통과
  - ✅ `generate_typescript_types`로 `lib/supabase/database.types.ts` 재생성(5개 도메인 테이블). ⚠️ 스타터 `profiles`는 생성 마이그레이션 부재로 재생성분에서 누락 → 인증 정비(Task 025) 전까지 스타터 인증 코드 컴파일 위해 타입 블록 수동 보존(주석 명시)
  - ✅ `get_advisors` — 보안 경고 0건, 인덱스 누락·RLS 미적용 경고 0건(잔여 `unused_index` INFO는 미쿼리 상태 정상). `typecheck`·`lint`·`build` 통과
  - **산출물**: ✅ 적용된 마이그레이션, `lib/geo/kma-grid.ts`, `supabase/seed/mountains.sql`(+생성기 `supabase/seed/gen-mountains.mjs`), `lib/supabase/database.types.ts`
  - **의존성**: Task 007, Task 002(#7 결정)

- **✅ Task 015: 외부 API 서버 프록시 및 캐싱 기반 구조 구축** - 완료
  - ✅ 서버 전용 공통 fetch 래퍼(`lib/api/fetcher.ts`) — `window` 런타임 가드로 클라이언트 import 차단(`server-only` 미호이스팅 대체), 키는 호출부가 `serverEnv`로 주입(래퍼는 키 미접근). `fetchJson`/`fetchText` + `searchParams` 직렬화
  - ✅ 공통 정책 — 타임아웃(AbortController, 기본 8s), **지수 백오프 재시도 1회**(5xx·429·타임아웃·네트워크만 재시도, 4xx 즉시 실패), 표준 에러 매핑(`lib/api/errors.ts`: `ApiErrorCode`별 한국어 메시지·`FetchError`·`toApiError`)
  - ✅ 캐싱 레이어(`lib/api/cache.ts`) — `next.config.ts` 커스텀 `cacheLife` 프로필 5종(weather-30m/vilage-3h/air-1h/uv-3h/trails-6h, 결정 003 TTL) + 소스별 캐시 키 빌더(`weatherKey`·`vilageKey`·`airKey`·`uvKey`·`trailsKey`, `mountainId`·`base_date/base_time` 포함) + 무효화 태그. 소스 모듈이 `'use cache'` 안에서 `cacheLife`/`cacheTag`로 사용(Task 016+)
  - ✅ stale 폴백 `withStaleFallback` — 신선 조회 실패 시 마지막 성공 스냅샷을 `PartialResult.stale`(+`fetchedAt`)로 반환("N분 전 기준" 라벨 지원), 스냅샷 없으면 `failure`
  - ✅ `cacheComponents: true` 전제 빌드 검증 통과(커스텀 cacheLife 프로필 정상 인식)
  - ✅ **로직 검증 23/23 통과**(실제 컴파일 산출물 대상): 재시도(500→성공·지속500·400즉시), 타임아웃, 백오프 지연, 에러 매핑, 캐시 키/태그·TTL, success→stale→failure 전이. `typecheck`·`lint`·`build` 통과
  - ⏳ **Playwright 네트워크/캐시히트/stale 폴백 E2E는 이 인프라를 소비하는 첫 실엔드포인트(Task 016 날씨)에서 수행** — 현재는 소비 라우트 부재로 로직 단위 검증으로 대체
  - **산출물**: ✅ `lib/api/{fetcher,cache,errors,index}.ts`, `next.config.ts`(cacheLife 프로필)
  - **의존성**: Task 003, Task 006

- **✅ Task 016: 기상청 단기예보 연동 구현** - 완료
  - ✅ 단기예보(getVilageFcst) 클라이언트 — `base_date`/`base_time` 산출(KST 환산, 발표시각 [02·05·08·11·14·17·20·23]시 + 10분 여유, 02:10 이전 전날 2300 롤백). **초단기실황이 아닌 단기예보 채택 근거**: `WeatherSnapshot`이 요구하는 POP·SKY·TMP는 초단기실황에 없고 단기예보에만 존재 → 6종을 한 소스로 충족(결정 001 #3 "혼용"의 초단기 보정은 향후 확장 여지)
  - ✅ 응답 파싱·정규화 — 오늘(targetDate) 예보만 카테고리별 (시각→값)으로 모아 현재 시각 최근접 슬롯 채택, `TMP·POP·SKY·PTY·WSD·REH`→`WeatherSnapshot`, SKY/PTY 코드→시맨틱 매핑(미매핑 안전 폴백). 순수 로직은 프레임워크 무의존 `kma-forecast-core.ts`로 분리해 단위 검증 가능
  - ✅ Route Handler `GET /api/weather?mountainId=` — `mountains.grid_nx/grid_ny` 조회 후 호출, `'use cache'`+`cacheLife("weather-30m")`+`cacheTag`로 캐싱. 봉투: 성공 ok / stale→partial(issues) / 실패 error, 요청오류만 4xx(400 파라미터·404 산 없음)
  - ✅ 실패 폴백 — `withStaleFallback` 마지막 성공 스냅샷("N분 전 기준"), 실패 시 error 봉투로 **크래시 없이** 격리(탐방로 등 타 소스 독립). `toApiError`가 정규화 실패 메시지를 보존하도록 소폭 보강
  - ✅ **proxy 공개경로에 `/api/` 추가** — 비로그인 상세 페이지가 소비하는 공개 데이터 API가 로그인 HTML로 리다이렉트되던 문제 해결(쿠키 로직 불변, 보호 API는 라우트 자체 401 예정 — Task 026)
  - ✅ **serviceKey 이중 인코딩 버그 수정** — `.env.local` 키가 Encoding 형태라 fetcher의 URLSearchParams가 `%`를 재인코딩→코드30. 호출부에서 `decodeURIComponent`로 1회만 인코딩(에어코리아·자외선 Task 021·022도 동일 규칙 적용 필요)
  - ✅ **테스트**: 순수 로직 단위 20/20 통과(base_time 자정/발표시각 경계 9종·정규화 성공/최근접폴백/코드매핑/resultCode≠00/빈items/필수결측/타일자 11종). Playwright 라이브 검증 — 북한산 28℃맑음·설악산 비·한라산 지역별 상이한 실데이터 ok 봉투, 파라미터누락 400·미존재산 404 봉투, 앱 콘솔 JS 에러 0(400/404는 테스트 유발 HTTP 로그). `typecheck`·`lint`·`build` 통과
  - ⏳ **상세 페이지 실연동·부분실패 UI 노출은 Task 019**에서 수행(현재 상세는 더미 유지) — Task 016은 API·정규화 레이어 확립까지
  - **산출물**: ✅ `app/api/weather/route.ts`, `lib/api/kma-forecast.ts`, `lib/api/kma-forecast-core.ts`, `lib/api/errors.ts`(toApiError 보강), `lib/supabase/proxy.ts`(`/api/` 공개), `scratchpad/test-forecast.ts`(로직 검증)
  - **의존성**: Task 014, Task 015

- **✅ Task 017: 탐방로 통제 데이터 적재 및 오늘 통제 여부 계산 구현** - 완료
  - ✅ `mountain.csv`(CP949, 91만 점 / **936 코스**(courseID 기준) / 22 사무소, 로컬·gitignore) 파싱 — `parse-knps-csv.ts`(TextDecoder euc-kr, 코스 식별키 `관리번호-사무소코드-코스ID`로 중복제거, 통제여부·통제설명·메타 추출). Task 029 좌표 적재에서 재사용
  - ✅ **계절 통제 판정**(`seasonal-closure.ts`, 순수) — 실측 통제설명 3계열(`탐방가능구간`/`통제구간`(상시)/`산불방지통제구간(기간)`)을 분류. `classifyClosure`(시드 적재용) + `resolveTrailStatusOn`(조회 시 closed_period·조회일 KST 비교로 오늘 개방/통제 재계산, 라이브 호출 없음). **경계일 단위검증 26/26 통과**
  - ✅ **사무소→산 매핑**(`mountain-name-matcher.ts`) — 국립공원 15개 사무소를 시드 산에 매핑, **북한산 국립공원(1501)은 북한산/도봉산을 코스명 키워드로 분리**. 미매핑 사무소(해상·경주 등)·이름없는 코스는 로그 후 제외. 무등산·팔공산·태백산·대둔산은 이 스냅샷에 부재 확인 → "정보 없음"
  - ✅ **(산, 코스명) 단위 집약 적재** — courseID 세그먼트 중복(예: '수통골 2코스'×3)을 명명 탐방로로 병합(통제 우선순위 상시>계절>개방). **317 trails / 16개 산**(개방 219·계절 89·상시 9), FK orphan 0. id 는 SQL `uuid_generate_v5`로 계산(JS uuidv5와 동일 검증 = 멱등·Task 029 좌표 매칭). 서비스롤(MCP) 쓰기
  - ✅ Route Handler `GET /api/trails?mountainId=` — trails 조회 + 오늘 실효 상태 계산. DB 스냅샷 자체가 캐시 계층이라 외부 캐싱 불필요, 오늘 상태는 요청 시각 기준 매번 계산(자정 경계 정확)
  - ✅ **커버리지 폴백** — 미보유 산은 빈 목록(→"정보 없음"), 계절 통제는 데이터 기준일과 무관하게 기간 계산으로 반영. 정적 스냅샷이라 돌발 통제는 미반영(정식 스펙)
  - ✅ **테스트**: 경계일 단위 26/26(기간 시작/종료 전후·연말 wrap·KST 자정). Playwright 라이브 — **설악산 16개방+1상시통제(울산바위, 계절통제는 오늘 8/8이라 개방으로 정확 재계산)**, 계룡산 17개방, 관악산 0(정보없음), 파라미터누락 400·미존재 404, JS 크래시 0. `typecheck`·`lint`·`build` 통과
  - ⏳ 상세 페이지 실연동(날씨/탐방로 소스 독립 격리 렌더)은 Task 019
  - **산출물**: ✅ `app/api/trails/route.ts`, `lib/trails/parse-knps-csv.ts`, `lib/trails/seasonal-closure.ts`, `lib/api/mountain-name-matcher.ts`, `supabase/seed/{trails.sql,gen-trails.ts}`, `scratchpad/test-trails.ts`
  - **의존성**: Task 001, Task 014 (탐방로는 정적 CSV라 Task 015 외부 API 프록시 불필요)

- **✅ Task 018: 산 검색 및 자동완성 기능 구현** - 완료
  - ✅ Route Handler `GET /api/mountains/search?q=` — 산 마스터 30여 종이 작아 캐시된 전체 목록을 받아 **JS 에서 부분일치 + 초성("ㅂㅎㅅ"→북한산) + 지역 검색**. 순수 코어(`lib/search/{hangul,mountain-search}.ts`)로 분리해 단위 검증 가능. **정렬은 정확도(정확>접두>포함>초성>지역) → 인기도(search_logs 선택 로그 tiebreak) → 가나다순**, 상한 8. 빈/공백 질의는 200+빈목록(에러 아님)
  - ✅ 자동완성 UI 실데이터 연동 — `mountain-search-input.tsx` 를 mock→실 API 로 전환, 디바운스 180ms + **직전 요청 취소(AbortController)**로 순서역전 방지. effect 본문 동기 setState 회피(중첩 async). **웜 캐시 응답 4~20ms 로 300ms 목표 크게 상회**
  - ✅ 산 선택 → `/mountains/[id]` 직결(결정 002 #2), 지역명 병기로 동명 산 구분. 최근 검색 `localStorage` 유지
  - ✅ 인기 산 목록 실데이터 전환 — `PopularMountains` async 서버 컴포넌트가 `getPopularMountains`(선택 로그 상위 → 부족분 마스터 이름순 백필)로 조회, 홈은 `<Suspense>` 스켈레톤 폴백. 홈 `/` 는 정적 프리렌더(revalidate 1h) 유지
  - ✅ `search_logs` 익명 로깅(결정 002 #14) — 후보 **선택 시** `POST /api/search-logs`(fire-and-forget, keepalive)로 query+mountain_id insert. RLS insert-only(anon) 준수, 라이브 검증서 1건 정확 기록
  - ✅ 캐싱 — 쿠키 비의존 공개 클라이언트(`lib/supabase/public.ts`)로 공개 데이터를 `'use cache'` 안에서 조회(server.ts 는 cookies() 때문에 use cache 불가). 프로필 2종 추가(`mountains-1d`·`search-1h`, next.config·cache.ts 동기화)
  - ✅ **테스트**: 검색 코어 단위 22/22(초성·부분일치·지역·정렬 tiebreak·상한·빈/공백/특수문자 방어). Playwright 라이브(360px) — 북한→북한산·ㅂㅎㅅ→북한산·강원 지역검색·상한8·에베레스트 "결과 없어요"·공백/특수문자 0건·선택 후 상세 이동·search_logs 로깅·인기 산 실데이터, 앱 콘솔 JS 에러 0. `typecheck`·`lint`·`build` 통과
  - **산출물**: ✅ `app/api/mountains/search/route.ts`, `app/api/search-logs/route.ts`, `lib/search/{hangul,mountain-search}.ts`, `lib/data/mountains.ts`, `lib/supabase/public.ts`, `components/{mountain-search-input,popular-mountains}.tsx`, `app/(main)/page.tsx`, `next.config.ts`·`lib/api/cache.ts`(캐시 프로필), `scratchpad/test-search.ts`
  - **의존성**: Task 014, Task 009

- **✅ Task 019: 상세 페이지 실데이터 연동 및 폴백 처리** - 완료
  - ✅ 상세 페이지 실데이터 전환 — 더미(`getMockMountainDetail`) 제거, 날씨는 `getWeatherSnapshot`(격자→기상청 단기예보), 탐방로는 DB 조회+오늘 실효 상태 계산으로 교체. 산 메타 조회+탐방로 계산을 상세/`/api/trails` 공용 데이터 계층(`lib/data/mountain-detail.ts`)으로 분리(route handler 중복 제거)
  - ✅ 독립 스트리밍 — 날씨/탐방로를 각자 `<Suspense>` 경계로 분리, `connection()`으로 동적 홀 명시(발표주기·"오늘" 변화 반영). 각 섹션 전용 스켈레톤 폴백으로 CLS 최소화
  - ✅ 부분 실패 격리(페이지 레벨 실증) — **기상청 키 무효화 라이브 주입** 결과 지리산에서 날씨는 에러 폴백("날씨 정보를 불러오지 못했어요")이지만 탐방로 51코스 정상 렌더·앱 크래시 0. `PartialResult`(success/stale/failure) + `withStaleFallback` "N분 전 기준" 라벨 경로 유지
  - ✅ **진짜 404 처리** — cacheComponents(PPR)에서 스트리밍 셸이 200을 flush하면 request-time `notFound()`가 200이 되는 문제를, `generateStaticParams`(고정 30종 시드)로 파라미터를 정적화하고 top-level 존재 게이트에서 `notFound()`를 호출해 해결(Next.js 스트리밍 가이드 준수). 산 메타는 공개 클라이언트+`'use cache'`(mountains-1d)로 게이트를 블로킹 가능하게 함. **정적 셸 프리렌더로 LCP 이점(Task 020)**
  - ✅ 파생 정비 — `[id]/loading.tsx`(세그먼트 Suspense) 제거(자식 map까지 셸 flush 유발), `[id]/map` 페이지도 동일 패턴(정적 파라미터+캐시 메타+notFound)으로 맞추고 mock 의존 제거. `error.tsx`는 렌더 throw용으로 유지
  - ✅ 2단계 섹션(컨디션 점수·대기질·자외선·장비·즐겨찾기)은 실 API 부재 → 가짜 점수 노출 방지 위해 페이지에서 제거(컴포넌트는 존치, Phase 4 Task 021~024·025에서 재통합)
  - ✅ **테스트**: Playwright(360px) — 설악산(16℃ 흐림·비, 탐방로 17개·울산바위 상시통제)·관악산(27℃ 맑음+탐방로 "정보 없음")·지리산(날씨실패+탐방로 정상) 렌더, 잘못된/형식오류 id·map 모두 **HTTP 404**, 유효 id 200, 콘솔 에러 0건. `typecheck`·`lint`·`build` 통과(`/mountains/[id]` `◐` 프리렌더 확인)
  - ⏳ 탐방로 단독/양쪽 실패는 DB 오류 주입이 까다로워 컴포넌트 단위(Task 010/011 mock)+구조적 격리(독립 Suspense·PartialResult)로 갈음(날씨 실패는 라이브 실증)
  - **산출물**: ✅ `app/(main)/mountains/[id]/page.tsx`, `app/(main)/mountains/[id]/map/page.tsx`, `lib/data/mountain-detail.ts`, `app/api/trails/route.ts`(공용 계층 재사용), `app/(main)/mountains/[id]/error.tsx`·`not-found.tsx`(유지)
  - **의존성**: Task 016, Task 017, Task 010

- **✅ Task 020: 1단계 MVP 완료 기준 검증 (통합 테스트)** - 완료
  - ✅ PRD 4.1 완료 기준 6항목 전수 검증 (Playwright MCP E2E, 360px)
    - ✅ 검색 자동완성 — 웜 캐시 **4~6ms**(5회 실측, 300ms 목표 대폭 상회), 타이핑 시 "설악"→"설악산 강원" 드롭다운 즉시 노출
    - ✅ 산 선택 → `/mountains/[id]` 이동 및 날씨 요약(설악산 15℃ 흐림·비/강수확률 60%/풍속 2.5㎧/습도 100%/"방금 기준")
    - ✅ 탐방로 배지 명확 구분(설악산 개방 16 + 울산바위 "상시 통제", 범례 개방·부분통제·통제 텍스트 병기)
    - ✅ 외부 API 실패 폴백 + 크래시 없음 — **잘못된 기상청 키 격리 인스턴스로 라이브 실증**(날씨 "불러오지 못했어요" 폴백 + 탐방로 17개 독립 정상, 콘솔 에러 0)
    - ✅ 로그인 없이 전체 흐름 — 홈·상세 HTTP 200 공개, `/favorites`만 로그인 리다이렉트(2단계 경계)
    - ✅ 360px 레이아웃 — 홈 가로 오버플로 0px, 상세 scrollWidth 345<360
  - ✅ 성능 — 산 상세 **LCP 148ms**(로컬 언스로틀, PPR 정적 셸 즉시 스트리밍). 정밀 4G 스로틀은 Task 032로
  - ✅ 엣지 케이스 — 오프라인 화면, API 실패(격리), 동시 5개 검색 교차오염 0, 존재하지 않는 산(형식오류·유효UUID·map·API 전부 404), 파라미터 누락 400
  - ✅ `npm run typecheck`·`lint`·`build` 통과(`/mountains/[id]` `◐` PPR 프리렌더 확인)
  - **산출물**: ✅ `docs/test-reports/phase3-mvp.md` (신규 이슈 0건 → 수정 커밋 불요)
  - **의존성**: Task 018, Task 019, Task 013

---

### Phase 4: 2단계 구현 (컨디션 점수 + 장비 추천 + 인증)

- **✅ Task 021: 미세먼지(에어코리아) 연동 구현** - 완료
  - ✅ 대기오염정보 API 클라이언트 — `getMsrstnAcctoRltmMesureDnsty`(측정소명 기준 실시간) 조회, `pm10Value/pm25Value/pm10Grade/pm25Grade` 파싱→`AirQuality` 정규화. 통신장애 "-"/빈값은 null, **PM10·PM2.5 둘 다 결측이면 failure·한쪽만 결측이면 성공(값만 null → 점수 계층이 변수 제외)**. 순수 로직은 `airkorea-core.ts`로 분리
  - ✅ **측정소 매핑 구현**(🔶#5 확정 규칙) — 측정소정보 서비스(`MsrstnInfoInqireSvc`) 활용신청 후 `getNearbyMsrstnList(tmX,tmY)`로 최근접 측정소+거리 직접 획득. 산 WGS84 → **TM 중부원점(EPSG:5181, GRS80) 정변환**(`wgs84ToTm`, 표준 Transverse Mercator) 구현. **거리 임계값 20km** 초과 시 `no_station` 폴백. 매핑은 `'use cache'`(mountains-1d)로 캐싱(거의 불변)
  - ✅ Route Handler `GET /api/air-quality?mountainId=` — `mountains.lat/lng` 조회 후 호출, 실시간 측정값은 `'use cache'`(air-1h)+`cacheTag`. 봉투: 성공 ok / stale→partial(issues) / 실패 error, 요청오류만 4xx(400 파라미터·404 산 없음)
  - ✅ 부분 폴백 — `no_station`(측정소 없음)·측정값 실패를 error 봉투로 격리(점수 계층이 변수 제외), `withStaleFallback` 마지막 성공 스냅샷("N분 전 기준"). 절대 throw 없음(소스 독립 격리)
  - ✅ **에어코리아 게이트웨이 no-store 거부 버그 수정** — B552584 게이트웨이는 undici 가 `cache:"no-store"`(및 no-cache/reload)에 붙이는 `Cache-Control` 요청헤더에 **503(58초 지연)/행**으로 응답(날씨 1360000 은 정상). fetcher 에 `cache` 옵션 추가(기본 no-store 유지)하고 airkorea 만 `cache:"default"` 사용(신선도는 `'use cache'` 가 관리). 4개 cache 모드 실측으로 원인 규명(`default`·`force-cache` 정상 / `no-store`·`no-cache`·`reload` 실패)
  - ✅ **TM 변환 라이브 검증** — 불변식(tmX@127°E=200000·tmY@원점=500000) + `getNearbyMsrstnList` 반환 거리로 정합 확인: 북한산→강북구(3km)·설악산→양양읍(14km)·한라산→강정동(12.9km)·지리산→산청읍(15.6km)·북악산→종로(2.6km)·금정산→청룡동(3.7km) 모두 타당·임계값 이내
  - ✅ **테스트**: 순수 로직 단위 27/27(TM 불변식·정합, pickNearestStation 임계값/정렬/빈목록/오류코드, normalizeAirQuality 값·등급·한쪽결측/양쪽결측/미매핑등급/최신순). Playwright 라이브(360px) — 6개 산 실 PM10/PM2.5·등급·측정소·거리 ok 봉투, 파라미터누락 400·미존재산 404·형식오류 upstream, 콜드 fetch 격리(크래시 0). `typecheck`·`lint`·`build` 통과
  - ⏳ 측정소 없음(no_station) 라이브는 시드 30종이 모두 20km 이내라 단위 검증으로 갈음. 배지 UI(`AirQualityBadge`) 상세 연동은 컨디션 점수 통합(Task 023~) 시점으로 (Task 021은 API·정규화 레이어)
  - **산출물**: ✅ `app/api/air-quality/route.ts`, `lib/api/airkorea.ts`, `lib/api/airkorea-core.ts`, `lib/geo/nearest-station.ts`, `lib/api/fetcher.ts`(cache 옵션), `scratchpad/test-air.ts`
  - **의존성**: Task 015, Task 020

- **✅ Task 022: 자외선 지수 연동 구현** - 완료
  - ✅ 생활기상지수 V5 자외선 클라이언트 — `getUVIdxV5`(`areaNo`·`time` YYYYMMDDHH) 조회, `h0`~`h75`(발표시각+3h 간격) 파싱. **발표시각 06·18시 산출**(40분 여유, 06:40 이전 전날18 롤백) + **현재 시각 최근접 슬롯 채택**(날씨 스냅샷과 동일 철학). 순수 로직은 `kma-uv-core.ts`로 분리
  - ✅ **areaNo 매핑**(🔶#6) — 위경도→areaNo API 부재라 시드 30종별 **시군구 법정동코드를 라이브 전수 검증**(getUVIdxV5 resultCode 00)해 정적 테이블(`MOUNTAIN_AREA_NO`, mountainId 기준)로 고정. **강원=51·전북=52 특별자치도 신 코드 필수**(구 42·45 는 "검색결과 없음") 실측 규명
  - ✅ **광주(29)·전남(46) 서비스 미커버 확인·대응** — 전 시군구·시도 코드·발표시각 변형 스캔 결과 **UV 데이터 자체 부재** 판명. 무등산·월출산은 **최근접 유효 코드(전북 정읍 5218)로 근사**(UV 는 위도 기반이라 ±1° 영향 미미, 등급 버킷 변동 거의 없음). 미매핑 mountainId 는 `not_covered`(UV 제외)
  - ✅ Route Handler `GET /api/uv?mountainId=` — `'use cache'`(uv-3h, 캐시키 (areaNo, 발표시각))+`cacheTag`. 봉투: 성공 ok / stale→partial(issues) / 실패 error, 요청오류만 4xx(400·404). `withStaleFallback` "N분 전 기준" 폴백. 절대 throw 없음(소스 독립 격리)
  - ✅ UV 구간→등급 매핑(`uvGradeFromValue`, 낮음 0~2/보통 3~5/높음 6~7/매우높음 8~10/위험 11+, Task 006 `UV_GRADE_THRESHOLDS` 재사용), `not_covered`/`parse_error`/`upstream_error` 분기
  - ✅ **테스트**: 순수 로직 단위 24/24(발표시각 06/18 경계·여유, 등급 구간 경계, 최근접 슬롯·빈슬롯 skip·resultCode 99→not_covered·03→upstream·빈 item). Playwright 라이브(360px) — 7개 지역 ok 봉투(야간 UV0 낮음·time 슬롯 정확), 무등산·월출산 근사 매핑 ok, 파라미터누락 400·미존재 404. **낮 시각(12시) 실데이터 등급 실증**: 서울 UV10 매우높음·제주 6 높음·설악(양양) 5 보통·정읍 8 매우높음. `typecheck`·`lint`·`build` 통과
  - ⏳ UV 배지(`UvIndexBadge`) 상세 연동은 컨디션 점수 통합(Task 023~) 시점으로 (Task 022는 API·정규화 레이어)
  - **산출물**: ✅ `app/api/uv/route.ts`, `lib/api/kma-uv.ts`, `lib/api/kma-uv-core.ts`, `scratchpad/test-uv.ts`
  - **의존성**: Task 015, Task 020

- **✅ Task 023: 컨디션 점수 산출 엔진 구현** - 완료
  - ✅ 100점 기준 감점 엔진(`computeConditionScore`, 순수 함수) — POP 30→70% 선형 −25 / PTY 유형별 단계(약 −5·본격 −10) / TMP 쾌적 5~22℃ 이탈폭 선형(이탈 15℃서 최대 −20) / WSD 7→14m/s 선형 −15 / 미세먼지 나쁨 −10·매우나쁨 −20(PM10·PM2.5 중 나쁜 등급) / UV 6→11 선형 −10. **각 감점 정수 반올림 후 합산**해 breakdown −합과 (100−score) 일치, 합계 초과 시 0 클램프. `calcVersion="v1"` 태깅(🔶#10)
  - ✅ 점수 → 등급/메시지 매핑(`grade.ts`) — 도메인 `SCORE_GRADE_THRESHOLDS` 단일 출처 재사용(매우좋음 80~/좋음 60~/보통 40~/나쁨 20~/위험 0~), 등급별 메시지 상수
  - ✅ `ScoreBreakdown` 산출 — 감점 후보를 크기순 정렬해 상위 3개 반환(근거 노출용)
  - ✅ **부분 폴백** — 대기질/자외선 결측 시 해당 변수만 감점 후보에서 제외하고 `excludedVariables` 표기(점수는 나머지로 계산). 상세 화면 `ScoreBreakdown`이 "일부 데이터 제외" 배지 렌더(Task 011 컴포넌트 연동)
  - ✅ 오케스트레이터(`service.ts`) — 날씨·대기·자외선 **병렬 조회**, 날씨 실패면 점수 불가(failure)·날씨 stale면 결과도 stale 승계, 대기/자외선 실패는 excluded 처리. **서버에서만 계산**(입력 원천이 서버 프록시 전용)
  - ✅ `condition_scores` 캐시(🔶#9) — 공개 SELECT로 최신·현재버전·TTL(30분) 이내 행 조회(`readCachedScore`), 신선 행 없을 때만 append 저장으로 행 폭증 방지. **쓰기는 서비스 롤 전용**(RLS)이라 `lib/supabase/admin.ts` 서비스 롤 클라이언트 사용. `SUPABASE_SERVICE_ROLE_KEY` 미설정 시 저장만 생략(계산·표시는 정상, graceful degrade)
  - ✅ Route Handler `GET /api/condition?mountainId=` — 봉투: 성공 ok / 날씨 stale→partial(issues) / 실패 error, 요청오류만 4xx(400·404). 상세 페이지에 **컨디션 점수 히어로 섹션**(게이지+근거) `<Suspense>` 스트리밍 통합
  - ✅ **부수 버그 수정(Task 016 날씨 레이어)** — 23시 발표는 **익일 예보만** 포함(당일 데이터 0건, 실측 확인)이라 23:10~23:59 사이 날씨·컨디션이 전부 `parse_error`로 먹통이던 문제 규명. `getVilageBaseDateTime`이 당일 발표 후보에서 23시를 제외(20시 발표로 폴백, 당일 21~23시 포함)하도록 수정. 23시 발표(익일치)는 기존 자정 롤백 경로가 소비
  - ✅ **테스트**: 경계값 단위 21/21(POP 30/70%, TMP 5/22℃·이탈, WSD 7/14, UV 6/11, 미세먼지 등급, 감점 합계 >100→0 클램프, excluded 2종, breakdown 상위 3 제한). Playwright 라이브 — 관악산 95점·계룡산 99점 게이지·등급·근거 렌더 정상, 400·404 봉투, 날씨 실패 시 컨디션 섹션 격리(비크래시). `typecheck`·`lint`·`prettier` 통과
  - **산출물**: ✅ `lib/condition/{score,grade,service,cache,index}.ts`, `lib/supabase/admin.ts`, `app/api/condition/route.ts`, `app/(main)/mountains/[id]/page.tsx`(컨디션 섹션), `lib/api/kma-forecast-core.ts`(버그수정), `lib/env.ts`(서비스 롤 키)
  - **의존성**: Task 021, Task 022, Task 014

- **✅ Task 024: 장비 추천 규칙 엔진 구현** - 완료
  - ✅ PRD 4.2 규칙 표를 **선언적 룰셋**(`GEAR_RULES`)으로 구현 — 비/강수(POP≥50 또는 PTY 비·소나기) → 방수 자켓·배낭 레인커버 / TMP≤5℃ → 방한 장갑·넥워머·보온 레이어 / TMP≥28℃ → 여벌 물·전해질·모자 / WSD≥10m/s → 바람막이·체온 유지 레이어 / 미세먼지 나쁨↑ → KF 마스크 / UV≥6 → 선크림·선글라스·챙모자. 각 규칙은 발동 조건(`evaluate`)+장비 목록 선언, 발동 시 근거·발동변수(trigger) 부착
  - ✅ **우선순위 정렬**(비<저온<고온<강풍<미세먼지<자외선, 안전 장비 우선) + **중복 제거**(같은 id 은 상위 우선순위 근거 유지). 비/강수 규칙 근거는 강수형태(비/소나기) 우선, 없으면 `강수확률 N%`
  - ✅ **결측 변수 규칙 평가 제외** — 대기질/자외선 데이터 없으면(null) 해당 규칙 미발동(오탐 방지)
  - ✅ 점수·장비를 `ConditionBundle{score,gear}` 로 묶어 오케스트레이터가 **소스 1회 조회로 함께 산출**(중복 외부 호출 없음). `/api/condition` 은 `ApiResponse<ConditionBundle>`, 상세 페이지에 `GearRecommendationList` 실데이터 연동
  - ✅ **테스트**: 조건 조합 단위 13/13(비+저온·고온+고UV·강풍+미세먼지, 각 경계 5/28℃·10m/s·UV6·POP50, 중복 제거·우선순위·결측 제외·소나기 근거). Playwright 라이브 — 설악산(비, 71점) 방수 자켓·레인커버 렌더+"일부 데이터 제외: 미세먼지" 배지 동시 실증. `typecheck`·`lint`·`prettier` 통과
  - **산출물**: ✅ `lib/condition/gear-rules.ts`, `lib/condition/service.ts`(번들화), `lib/types/condition.ts`(`ConditionBundle`), `app/api/condition/route.ts`, `app/(main)/mountains/[id]/page.tsx`(장비 섹션), `components/gear-recommendation-list.tsx` 연동
  - **의존성**: Task 023

- **✅ Task 025: 인증 활성화 및 보호 라우트 정비** - 완료
  - ✅ 스타터킷 인증 흐름 산길날씨 기준 한글화·리다이렉트 정비 — 로그인/회원가입/비밀번호 재설정(forgot·update)/성공·에러 페이지·Google 버튼·로그아웃 전부 한글 카피. 로그인 성공 후 **`next` 파라미터 또는 기본 `/favorites`** 이동(기존 `/protected` 대체), OAuth 콜백·이메일 리다이렉트 목적지도 `/favorites` 로 통일
  - ✅ `proxy.ts` — `/favorites` 는 기존 기본-차단 정책으로 이미 보호됨(공개: `/`·`/mountains/*`·`/offline`·`/auth/*`·`/api/*`). 미인증 리다이렉트에 **`?next=<원래경로>`** 부착해 로그인 후 복귀 지원(쿠키 처리 로직 불변)
  - ✅ **서버 이중 방어** — `/favorites` 서버 컴포넌트에서 `getClaims()` 재확인 후 미인증 시 `redirect("/auth/login?next=/favorites")`. 로그인 페이지는 내부 경로만 허용(`safeNext`)해 오픈 리다이렉트 차단
  - ✅ 로그인 폼 기존 패턴 유지(Client Component `supabase.auth.signInWithPassword` 직접 호출), `next` prop 이어받아 이동
  - ✅ 헤더(`SiteHeader`)에 인증 컨트롤 통합 — 즐겨찾기 링크 상시 노출(비로그인 클릭→proxy 로그인 유도), 로그인/로그아웃 토글. 상세 페이지에 `FavoriteButton`(서버 `getClaims` 로 `isAuthenticated` 주입) 배치 → 비로그인 클릭 시 "로그인하면 저장할 수 있어요" 유도(실제 토글은 Task 026)
  - ✅ **테스트**: Playwright E2E — 비로그인 `/favorites`→`?next=/favorites` 리다이렉트, 로그인 후 `/favorites` 복귀, 로그아웃→홈·재접근 시 재리다이렉트(세션 만료), 홈·상세 비로그인 정상, 게스트 하트 로그인 유도. E2E 계정 `sangil-e2e@example.com` 사용(Task 026 RLS 검증에도 활용). `typecheck`·`lint`·`prettier` 통과
  - **산출물**: ✅ `lib/supabase/proxy.ts`, `app/auth/login/page.tsx`, `components/{login,sign-up,forgot-password,update-password,google-auth,auth,logout}-*.tsx`, `components/site-header.tsx`, `app/(main)/favorites/page.tsx`, `app/(main)/mountains/[id]/page.tsx`(FavoriteButton), `components/mountain-detail.tsx`
  - **의존성**: Task 002(#12), Task 020

- **✅ Task 026: 즐겨찾기 기능 구현 (RLS 포함)** - 완료
  - ✅ `favorites` CRUD — `app/api/favorites/route.ts`(POST 추가/DELETE 삭제). **세션 쿠키 서버 클라이언트**라 모든 쿼리에 RLS 적용, `user_id` 는 세션 클레임에서 채워 타인 행 조작 차단. `(user_id, mountain_id)` 유니크 충돌(23505)은 **멱등 성공** 처리, 비로그인은 401 JSON
  - ✅ `/favorites` 목록 — RLS 로 본인 행만 조회(favorites⨝mountains), 각 산의 **컨디션 점수 요약**을 함께 산출(원천 데이터 `'use cache'` 재사용). 상세 헤더 하트(`FavoriteButton`)로 추가/해제, 목록 카드 인라인 해제
  - ✅ **낙관적 업데이트 + 롤백** — 하트/목록 삭제 모두 즉시 UI 반영 후 실패 시 원복(목록은 순서 보존). 성공 시 `router.refresh()` 로 서버 목록 반영. 비로그인 클릭은 로그인 유도 팝오버
  - ✅ **RLS 격리 검증(실쿼리)** — user2 세션(`set role authenticated`+jwt sub)에서 user1 행 **select 0건·delete 0건·insert(user_id 위조) 정책 위반 차단**(`new row violates row-level security policy`) 3종 모두 실증
  - ✅ **E2E(Playwright)** — 로그인→상세 하트 추가(DB 1행)→목록에 점수(관악산 95 매우 좋음) 반영→인라인 해제→빈 상태(DB 0행), **중복 POST 2회 멱등**(1행 유지), 비로그인 POST 401. `typecheck`·`lint`·`prettier` 통과, `get_advisors(security)` RLS 경고 0건
  - **산출물**: ✅ `app/api/favorites/route.ts`, `components/favorite-button.tsx`(낙관적 토글), `components/favorites-list.tsx`, `app/(main)/favorites/page.tsx`, `app/(main)/mountains/[id]/page.tsx`(초기 즐겨찾기 상태)
  - **의존성**: Task 025, Task 014, Task 023

- **✅ Task 027: 2단계 완료 기준 검증 (통합 테스트)** - 완료
  - ✅ PRD 4.2 완료 기준 6항목 전수 통과 (Playwright MCP E2E) — 점수/등급/메시지(관악 95·계룡 99·설악 71), 감점 근거 2~3개(설악 강수확률 60% −19·강수형태 비 −10), 장비 추천(설악 방수 자켓·레인커버), 즐겨찾기 추가/삭제(DB 1행↔0행), `favorites` RLS 격리, 부분 폴백(라이브 `excludedVariables:["air"]`)
  - ✅ 회귀 검증 — 동일 입력 → **동일 결과**(순수 함수, 계산시각 주입), `calcVersion:"v1"` 고정. **버전 변경 시 캐시 무효화**·TTL 만료를 `condition_scores` 실쿼리로 실증(`v0` 무시, `v1`+30분 이내 최신만)
  - ✅ 엣지 케이스 — 극단 기상값 0 클램프·breakdown≤3, 전 소스(날씨) 실패 시 섹션 격리, 전 변수 결측 폴백, 등급 경계 매핑, **동시 즐겨찾기 토글 멱등**(2연속 POST→1행)
  - ✅ 기준선 — `typecheck`·`lint`·`format:check`·**`build`** 통과(`/mountains/[id]`·`/favorites`·`/auth/login` PPR 프리렌더 확인), `get_advisors(security)` RLS 경고 0건
  - **산출물**: ✅ `docs/test-reports/phase4-condition.md`
  - **의존성**: Task 024, Task 026

---

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

- **Task 037: 방문완료 기록 및 방문 목록 화면** - 우선순위
  - DB: **`visited` 테이블**(`user_id`, `mountain_id`, `visited_at`, 메모 optional) + 본인만 접근 RLS(즐겨찾기와 동일 패턴). 스키마 변경 후 타입 재생성
  - 산 상세 화면에 **"방문완료" 토글**(하트 옆): 낙관적 업데이트 + 실패 롤백(`favorite-button` 패턴 재사용), best-effort 계측 이벤트(선택)
  - **방문완료 목록 화면**(`/visited` 또는 마이페이지 탭): 방문한 산 + 방문일 정렬, 상세로 직결
  - **테스트(Playwright MCP)**: 상세에서 방문완료 토글 → DB 반영 → 목록 노출 → 해제 시 롤백/제거 확인
  - **산출물**: 마이그레이션(`visited` + RLS), `app/api/visited/route.ts`, `components/visited-button.tsx`, 방문 목록 컴포넌트/라우트, 타입 재생성
  - **의존성**: Task 019, Task 025, Task 026

- **Task 038: 마이페이지(개인화 허브)**
  - 로그인 사용자용 **`/mypage`(가칭)** 화면: 프로필 요약 + **즐겨찾기·방문완료** 진입(개수 배지), 앞으로 추가될 개인화 화면의 확장 지점
  - 헤더/네비게이션에 마이페이지 진입점 추가(기존 "즐겨찾기" 링크 통합 검토), 보호 라우트(인증 필요, 기존 `/favorites` 게이트 패턴 재사용), 비로그인 시 로그인 유도
  - **산출물**: `app/(main)/mypage/page.tsx` 및 관련 컴포넌트, 헤더 네비 수정
  - **의존성**: Task 026, Task 037

---

## Task 의존성 요약

| Task | 선행 의존성   | 병렬 가능     |
| ---- | ------------- | ------------- |
| 001  | —             | —             |
| 002  | 001           | 003           |
| 003  | 001           | 002           |
| 004  | 002           | 006           |
| 005  | 002, 004      | 006, 007      |
| 006  | 001           | 004           |
| 007  | 003, 006      | 005           |
| 008  | 006           | —             |
| 009  | 005, 008      | 010, 011, 012 |
| 010  | 005, 008      | 009, 011, 012 |
| 011  | 008, 010      | 012           |
| 012  | 005, 008      | 009, 010, 011 |
| 013  | 009～012       | —             |
| 014  | 007, 002      | 015           |
| 015  | 003, 006      | 014           |
| 016  | 014, 015      | 017, 018      |
| 017  | 001, 014      | 016, 018      |
| 018  | 014, 009      | 016, 017      |
| 019  | 016, 017, 010 | —             |
| 020  | 018, 019, 013 | —             |
| 021  | 015, 020      | 022, 025      |
| 022  | 015, 020      | 021, 025      |
| 023  | 021, 022, 014 | 025           |
| 024  | 023           | 025           |
| 025  | 002, 020      | 021～024       |
| 026  | 025, 014, 023 | —             |
| 027  | 024, 026      | —             |
| 028  | 001, 027      | 030           |
| 029  | 028, 017      | 030           |
| 030  | 002, 003, 027 | 028, 029      |
| 031  | 029, 030      | —             |
| 032  | 031           | 033           |
| 033  | 031           | 032           |
| 034  | 019, 023, 029 | —             |
| 035  | 032, 033      | —             |
| 036  | 014, 018      | 037           |
| 037  | 019, 025, 026 | 036           |
| 038  | 026, 037      | —             |

**병렬 개발 라인**

- **UI 라인 (Phase 2)**: Task 008～013 — 더미 데이터만 사용하므로 백엔드 라인과 완전 독립
- **백엔드 라인 (Phase 3～4)**: Task 014～018, 021～024 — 외부 API·DB·점수 엔진
- **인증 라인**: Task 025～026 — Task 020 이후 점수 엔진과 병렬 진행 가능
- **개인화·콘텐츠 라인 (Phase 7)**: Task 036(100대명산 콘텐츠)·037(방문완료 개인화)은 상호 독립 → 병렬 가능, 038(마이페이지)은 037 이후

---

## 리스크 및 대응

| 리스크                                            | 영향                            | 대응                                                                                            |
| ------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| 🔶#4 탐방로 데이터: 정적 스냅샷·국립공원 한정 | 돌발 통제 미반영, 국립공원 외 산 공백 | (소스 확보) 계절 통제는 기간 계산으로 반영, 데이터 기준일 표기, 국립공원 외는 "정보 없음" 폴백(정식 스펙), 필요 시 라이브 개방정보 보완 |
| 🔶#15 등산로 GeoJSON                              | (해소) 국립공원공단 CSV로 좌표 확보·PoC 통과 | Task 029 폴리라인 오버레이 정식 구현; 코스 조립 키 정의 필요; 광역 확장 시 산림청 전국등산로표준데이터(15029184) 추가 검토 |
| 공공 API 호출 쿼터/장애 (기상·대기·자외선)        | 서비스 신뢰성 목표(95～98%) 미달 | Task 015의 서버 캐싱 일원화 + stale 응답 폴백("N분 전 기준"), Task 035에서 성공률 상시 모니터링 (탐방로는 정적 CSV라 쿼터 무관) |
| 기상청 격자 변환 정확도                           | 잘못된 지역 날씨 표출           | Task 014에서 변환 유틸 단위 검증 + 시드 데이터 샘플 교차 확인                                   |
| 컨디션 점수 가중치 부정확                         | 사용자 신뢰 하락                | `calc_version` 태깅으로 버전별 비교, 베타 피드백 기반 튜닝(🔶#11)                               |
| 카카오맵 SDK가 LCP 저해                           | 성능 KPI 미달                   | Task 028 지연 로딩 + Task 032 성능 회귀 검증                                                    |
