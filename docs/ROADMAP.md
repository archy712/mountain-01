# 산길날씨(SanGil) 개발 로드맵

산 이름 하나로 "지금 이 산에 가도 되는지"를 3초 안에 판단하게 해주는 등산 날씨·탐방로 통합 모바일 웹 앱

## 개요

산길날씨는 **주말/휴일 산행을 계획하는 일반 등산객**을 위한 **출발 전 의사결정 도구**로 다음 기능을 제공합니다:

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
  - ✅ 🔶#1 제품 영문/브랜드명 확정 — **SanGil**(국문 "산길날씨"), 대안 TrailCast 미채택
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

- **Task 005: 라우트 구조 및 공통 레이아웃 골격 구현** - 우선순위
  - App Router 전체 라우트 스캐폴딩 — `app/page.tsx`(홈/검색), `app/mountains/[id]/page.tsx`(상세), `app/favorites/page.tsx`, `app/mountains/[id]/map/page.tsx`, `app/offline/page.tsx`
  - 라우트별 `loading.tsx` / `error.tsx` / `not-found.tsx` 껍데기 생성 (PRD 7장 에러·로딩 요구사항 대응 자리 확보)
  - 모바일 우선 공통 레이아웃 골격 — 상단 헤더(로고+테마 스위처), 하단/상단 네비게이션, 최대 폭 컨테이너
  - `proxy.ts` 보호 경로 재정의 — 1단계는 `/`, `/mountains/*` 전면 공개, `/favorites`만 인증 요구(2단계 활성화)
  - `params`/`searchParams` 비동기 시그니처 적용 (Next.js 16 규약)
  - **산출물**: `app/mountains/[id]/`, `app/favorites/`, `app/offline/`, `components/site-header.tsx`, `proxy.ts`
  - **의존성**: Task 002, Task 004

- **Task 006: 도메인 타입 및 API 표준 스키마 정의**
  - 도메인 타입 정의 — `lib/types/mountain.ts`(Mountain, Trail, TrailStatus), `lib/types/weather.ts`(WeatherSnapshot: TMP/POP/SKY/PTY/WSD/REH), `lib/types/air.ts`(AirQuality, UvIndex)
  - 컨디션 점수 타입 정의 — `lib/types/condition.ts`(ConditionScore, ScoreBreakdown, ScoreGrade, GearItem)
  - 외부 API 응답 → 앱 내부 표준 스키마 정규화 계약 정의 (`normalize*` 함수 시그니처, 부분 실패를 표현하는 `PartialResult<T>` 타입)
  - API Route Handler 공통 응답 타입 정의 — 성공/부분성공/실패 및 `fetchedAt`(“N분 전 기준” 라벨용) 필드 포함
  - **산출물**: `lib/types/*.ts`
  - **의존성**: Task 001

- **Task 007: Supabase 스키마 설계 및 마이그레이션 작성 (적용 제외)**
  - `mountains` DDL 설계 — `id`(uuid PK), `name`, `region`, `altitude`, `grid_nx`/`grid_ny`, `lat`/`lng`, 검색용 인덱스(`name` trigram 또는 부분일치 인덱스)
  - `trails` DDL 설계 — `id`, `mountain_id`(FK→mountains), `name`, `status`(개방/통제/부분통제 enum 또는 check), `closed_reason`, `path_geojson`(jsonb, 3단계용 nullable)
  - `favorites` DDL 설계 — `id`, `user_id`(FK→auth.users), `mountain_id`, `created_at`, `(user_id, mountain_id)` 유니크 제약
  - `condition_scores` DDL 설계 — `id`, `mountain_id`, `score`, `grade`, `breakdown`(jsonb), `calc_version`, `computed_at`, 조회 인덱스
  - `search_logs` DDL 설계 — `id`, `query`, `mountain_id`(nullable), `created_at`
  - RLS 정책 SQL 작성 — `mountains`/`trails` 공개 select·쓰기 차단, `favorites`는 `user_id = auth.uid()` 조건 select/insert/delete, `condition_scores` 공개 select·서비스 롤 쓰기, `search_logs` insert만 허용·select 차단
  - **산출물**: `supabase/migrations/*_sangil_core_schema.sql`, `supabase/migrations/*_sangil_rls.sql` (작성만, 적용은 Task 014)
  - **의존성**: Task 003 (RLS 정책 확정), Task 006

---

### Phase 2: UI/UX 완성 (더미 데이터 활용)

> 이 Phase는 외부 API 없이 하드코딩 더미 데이터만으로 전 화면을 완성한다. Phase 3～5의 백엔드 작업과 병렬 진행 가능하다.

- **Task 008: 디자인 토큰 및 공통 컴포넌트 라이브러리 구축**
  - 아웃도어 톤 색상 토큰 추가 — `app/globals.css`의 `:root`/`.dark` HSL 변수와 `tailwind.config.ts`의 `theme.extend.colors`를 **동시** 수정 (상태 색상: `--status-open`, `--status-closed`, `--status-partial`, 등급 색상 5종)
  - shadcn/ui 프리미티브 추가 — `npx shadcn@latest add` 로 `command`(자동완성), `skeleton`, `alert`, `tabs`, `sheet`, `separator`, `progress`
  - 상태 표시 공통 컴포넌트 — `components/trail-status-badge.tsx` (색상 단독 구분 금지: 아이콘 + 텍스트 병행)
  - 로딩/에러 공통 컴포넌트 — `components/result-skeleton.tsx`, `components/error-fallback.tsx`(사용자 친화 메시지 + 재시도 버튼), `components/stale-data-notice.tsx`("N분 전 기준" 라벨)
  - 더미 데이터 유틸 — `lib/mock/mountains.ts`, `lib/mock/weather.ts`, `lib/mock/condition.ts` (Task 006 타입 준수)
  - **산출물**: `components/ui/*`, `components/trail-status-badge.tsx`, `components/result-skeleton.tsx`, `components/error-fallback.tsx`, `lib/mock/*`
  - **의존성**: Task 006

- **Task 009: 홈/검색 화면 UI 구현**
  - `MountainSearchInput` 구현 — 검색 인풋 + 자동완성 드롭다운(더미 후보), 키보드 내비게이션, 44x44px 이상 터치 타깃
  - 최근 검색 기록 UI — `localStorage` 기반 최근 검색어 칩 목록 및 개별 삭제
  - 인기 산 목록 카드 그리드 — 더미 데이터 기반
  - 빈 상태/검색 결과 없음 UI, 자동완성 로딩 스켈레톤
  - 360px 폭 기준 레이아웃 검증
  - **산출물**: `app/page.tsx`, `components/mountain-search-input.tsx`, `components/recent-searches.tsx`, `components/popular-mountains.tsx`
  - **의존성**: Task 005, Task 008

- **Task 010: 산 상세 결과 화면 UI 구현 (1단계 범위)**
  - `WeatherSummaryCard` — 기온/강수확률/하늘상태/강수형태/풍속을 한 화면 요약, 아이콘 + 수치 병기
  - `TrailStatusBadge` 배치 및 탐방로 목록 섹션 — 개방/통제/부분통제 구분, 통제 사유·기간 표시
  - `MountainDetail` — 위치·고도·지역 등 기본 메타 섹션
  - 페이지 상단 "결론 우선" 정보 위계 구성 (스크롤 없이 판단 가능한 히어로 영역)
  - 부분 실패 표현 UI — 날씨만 실패 / 탐방로만 실패 / "정보 없음" 각 케이스 시각화
  - **산출물**: `app/mountains/[id]/page.tsx`, `components/weather-summary-card.tsx`, `components/mountain-detail.tsx`, `components/trail-list.tsx`
  - **의존성**: Task 005, Task 008

- **Task 011: 컨디션 점수 및 장비 추천 UI 구현 (2단계 범위)**
  - `ConditionScoreGauge` — 0～100 게이지, **텍스트 등급/메시지 병기 필수**(접근성), 등급별 색상 토큰 적용
  - `ScoreBreakdown` — 주요 감점 요인 2～3개 리스트("강수확률 70% −20" 형식), "일부 데이터 제외" 배지
  - `GearRecommendationList` — 조건별 장비 카드 목록, 추천 근거 문구 병기
  - `AirQualityBadge`(PM10/PM2.5 등급), `UvIndexBadge`(UV 지수 구간)
  - `FavoriteButton` UI(비활성/활성 상태, 비로그인 시 로그인 유도 문구)
  - **산출물**: `components/condition-score-gauge.tsx`, `components/score-breakdown.tsx`, `components/gear-recommendation-list.tsx`, `components/air-quality-badge.tsx`, `components/uv-index-badge.tsx`, `components/favorite-button.tsx`
  - **의존성**: Task 008, Task 010

- **Task 012: 즐겨찾기·지도·오프라인 화면 UI 구현 (2～3단계 범위)**
  - `/favorites` — 저장한 산 카드 목록(요약 점수 포함), 빈 상태 및 비로그인 안내 UI
  - `/mountains/[id]` 지도 섹션 자리표시자 + `MapLegend`(개방/통제 색상 범례, 텍스트 병기)
  - `/mountains/[id]/map` 전체화면 지도 레이아웃 골격
  - `/offline` 네트워크 단절 안내 화면, `PwaInstallPrompt` 배너 UI
  - **산출물**: `app/favorites/page.tsx`, `app/mountains/[id]/map/page.tsx`, `app/offline/page.tsx`, `components/map-legend.tsx`, `components/pwa-install-prompt.tsx`
  - **의존성**: Task 005, Task 008

- **Task 013: 반응형·접근성 기준 검증**
  - 360px / 390px / 768px / 1024px 뷰포트 레이아웃 깨짐 검사 (Playwright MCP `browser_resize` + 스냅샷)
  - 터치 타깃 최소 44x44px 전수 검사, 폼 라벨·`aria-*` 속성 점검
  - 색상 단독 정보 전달 금지 원칙 준수 확인 (탐방로 상태, 컨디션 등급 모두 텍스트/아이콘 병기)
  - 키보드 내비게이션 및 포커스 링 확인, 다크모드 대비 검증
  - **테스트 체크리스트**: Playwright MCP로 홈 → 자동완성 → 상세 → 즐겨찾기 전 화면 스냅샷 및 콘솔 에러 0건 확인
  - **산출물**: 접근성 점검 결과 및 수정 커밋
  - **의존성**: Task 009, Task 010, Task 011, Task 012

---

### Phase 3: 1단계 MVP 핵심 기능 구현 (날씨 + 탐방로)

- **Task 014: DB 마이그레이션 적용 및 산 마스터 시드 적재** - 우선순위
  - Task 007에서 작성한 마이그레이션을 `mcp__supabase__apply_migration`으로 적용 (core schema → RLS 순)
  - 산 마스터 시드 데이터 구축 — 주요 산 목록(이름·지역·고도·위경도) 수집 및 `mountains` 적재
  - **위경도 → 기상청 격자(nx, ny) 변환 유틸** 구현 및 시드 시 `grid_nx`/`grid_ny` 사전 적재 (🔶#7 확정안 반영)
  - `mcp__supabase__generate_typescript_types`로 **`lib/supabase/database.types.ts` 재생성** 및 `Tables<"mountains">` 등 헬퍼 사용 전환
  - `mcp__supabase__get_advisors`로 RLS 미적용·인덱스 누락 경고 0건 확인
  - **산출물**: 적용된 마이그레이션, `lib/geo/kma-grid.ts`, `supabase/seed/mountains.sql`, `lib/supabase/database.types.ts`
  - **의존성**: Task 007, Task 002(#7 결정)

- **Task 015: 외부 API 서버 프록시 및 캐싱 기반 구조 구축** - 우선순위
  - **모든 외부 호출을 서버(Route Handler/서버 유틸)에서만 수행**하는 공통 fetch 래퍼 구현 — API 키는 서버 환경변수로만 접근, 클라이언트 번들 노출 차단
  - 공통 정책 구현 — 타임아웃, 재시도(지수 백오프 1회), 호출 실패 시 표준 에러 매핑, 응답 정규화 파이프라인
  - 캐싱 레이어 구현 — Task 003에서 확정한 방식(`"use cache"` + `cacheLife` 또는 `revalidate`)으로 소스별 TTL 적용(날씨/대기질/탐방로), 캐시 키에 `mountainId`·`base_date/base_time` 포함
  - 최근 성공 응답 보존 로직 — 실패 시 stale 캐시를 `fetchedAt`과 함께 반환하여 "N분 전 기준" 라벨 지원
  - `next.config.ts`의 `cacheComponents: true` 전제 하 동작 검증
  - **테스트 체크리스트**: Playwright MCP `browser_network_requests`로 클라이언트에서 외부 도메인 직접 호출 0건 확인, 캐시 히트 시 응답 시간 단축 확인, 강제 실패 주입 시 stale 폴백 동작 확인
  - **산출물**: `lib/api/fetcher.ts`, `lib/api/cache.ts`, `lib/api/errors.ts`
  - **의존성**: Task 003, Task 006

- **Task 016: 기상청 단기예보 연동 구현**
  - 기상청 단기예보(+ 확정 시 초단기실황 혼용) 클라이언트 구현 — `base_date`/`base_time` 산출 로직(발표 시각 규칙) 포함
  - 응답 파싱 및 정규화 — `TMP`, `POP`, `SKY`, `PTY`, `WSD`, `REH`를 `WeatherSnapshot`으로 변환, 하늘상태/강수형태 코드 → 한국어 라벨 매핑
  - Route Handler `GET /api/weather?mountainId=` 구현 — `mountains.grid_nx/grid_ny` 조회 후 호출, 캐시 TTL 적용
  - 실패 폴백 — "날씨 정보를 불러오지 못했습니다" + 재시도, 탐방로 정보는 정상 노출되도록 부분 실패 격리
  - **테스트 체크리스트**: Playwright MCP로 정상 응답 렌더링, API 500/타임아웃 주입 시 폴백 UI 노출 및 페이지 크래시 없음, 자정 전후 `base_time` 경계 케이스 확인
  - **산출물**: `app/api/weather/route.ts`, `lib/api/kma-forecast.ts`
  - **의존성**: Task 014, Task 015

- **Task 017: 탐방로 통제 데이터 적재 및 오늘 통제 여부 계산 구현**
  - 국립공원공단 `mountain.csv`(CP949, 91만 점 / 625코스 / 22개 사무소, 로컬·gitignore) 파싱 — 코스별 `통제여부`·`통제구간 설명`·메타(난이도·거리·소요시간) 추출, **코스 식별키(관리번호+코스ID+사무소코드) 정의**
  - **계절 통제 기간 파싱 및 오늘 통제 여부 계산** — `산불방지통제구간(3월 1일～4월 30일)` 형식에서 기간 추출 → 조회일과 비교해 개방/통제 결정 (라이브 API 호출 없음)
  - 산/코스명 → `mountains`/`trails` 매핑 (명칭 정규화, 매칭 실패 시 미매핑 로그)
  - `trails` 적재 — `status`·`closed_reason`·`closed_period`, 서비스 롤 쓰기 (좌표 geometry는 Task 029에서 동일 CSV로 적재)
  - Route Handler `GET /api/trails?mountainId=` — `trails` 조회 + 오늘 통제 여부 계산, DB 캐시
  - **커버리지/신선도 폴백** — 국립공원 외(도립·군립·근교산) 미보유 산은 "정보 없음" 명시, 정적 2023 스냅샷이라 돌발 통제 미반영 → 데이터 기준일 표기(향후 라이브 개방정보 보완 여지)
  - **테스트 체크리스트**: 계절 통제 경계일(기간 시작/종료 전후) 계산 단위 검증, Playwright MCP로 개방/통제/정보없음 배지 렌더링, 탐방로 데이터 결측 시 날씨는 정상 표시 확인
  - **산출물**: `app/api/trails/route.ts`, `lib/trails/parse-knps-csv.ts`, `lib/trails/seasonal-closure.ts`, `lib/api/mountain-name-matcher.ts`, `supabase/seed/trails.sql`
  - **의존성**: Task 001, Task 014 (탐방로는 정적 CSV라 Task 015 외부 API 프록시 불필요)

- **Task 018: 산 검색 및 자동완성 기능 구현**
  - Route Handler `GET /api/mountains/search?q=` 구현 — `mountains` 부분일치/초성 검색, 결과 상한 및 정렬(인기도·정확도)
  - 자동완성 UI 실데이터 연동 — 디바운스(150～200ms) 적용, **입력 후 300ms 내 후보 노출** 목표 달성
  - 산 선택 → `/mountains/[id]` 이동 플로우 연결 (🔶#2 확정 구조 반영), 동명 산 다건 시 지역 병기
  - 최근 검색 기록 `localStorage` 연동 및 인기 산 목록 실데이터 전환
  - `search_logs` 익명 로깅 (🔶#14 on으로 확정된 경우에만) — insert-only RLS 준수
  - **테스트 체크리스트**: Playwright MCP로 "북한" 입력 → 300ms 내 후보 노출 측정, 결과 없음 케이스, 특수문자/공백 입력 방어, 선택 후 상세 이동 확인
  - **산출물**: `app/api/mountains/search/route.ts`, `components/mountain-search-input.tsx` 연동
  - **의존성**: Task 014, Task 009

- **Task 019: 상세 페이지 실데이터 연동 및 폴백 처리**
  - `app/mountains/[id]/page.tsx`를 Server Component로 구성, `lib/supabase/server.ts`의 `await createClient()`로 산 메타 조회 (전역 캐싱 금지)
  - 날씨/탐방로 데이터 병렬 페칭 및 `Suspense` + `result-skeleton` 스트리밍 적용
  - Phase 2의 더미 데이터를 실제 API 응답으로 전면 교체
  - 부분 실패 정책 구현 — 소스별 독립 실패 처리, 가능한 정보만 표시, stale 캐시 시 "N분 전 기준" 라벨 노출
  - 존재하지 않는 `id` 접근 시 `not-found.tsx` 처리
  - **테스트 체크리스트**: Playwright MCP로 정상/날씨실패/탐방로실패/양쪽실패 4개 시나리오 렌더링 확인, 잘못된 id 404 확인, 콘솔 에러 0건
  - **산출물**: `app/mountains/[id]/page.tsx`, `app/mountains/[id]/loading.tsx`, `app/mountains/[id]/error.tsx`
  - **의존성**: Task 016, Task 017, Task 010

- **Task 020: 1단계 MVP 완료 기준 검증 (통합 테스트)**
  - PRD 4.1 완료 기준 6항목 전수 검증 (Playwright MCP E2E)
    - `/`에서 검색 시 **300ms 내 자동완성 후보 노출**
    - 산 선택 → `/mountains/[id]` 이동 및 오늘 날씨 요약 표시
    - 탐방로 개방/통제/부분통제 배지 명확 구분
    - 외부 API 실패 시 폴백 UI 노출 및 **앱 크래시 없음**
    - **로그인 없이** 검색～결과 확인 전체 흐름 완결
    - 360px 폭 레이아웃 깨짐 없음
  - 성능 기준 검증 — 결과 페이지 LCP 모바일 4G 기준 **2.5s 이하**
  - 엣지 케이스 — 네트워크 오프라인, 외부 API 쿼터 소진, 동시 다중 검색, 존재하지 않는 산
  - `npm run lint` 및 `npx tsc --noEmit` 통과 확인
  - **산출물**: `docs/test-reports/phase3-mvp.md`, 발견 이슈 수정 커밋
  - **의존성**: Task 018, Task 019, Task 013

---

### Phase 4: 2단계 구현 (컨디션 점수 + 장비 추천 + 인증)

- **Task 021: 미세먼지(에어코리아) 연동 구현**
  - 대기오염정보 API 클라이언트 구현 — `pm10Value`, `pm25Value`, `pm10Grade`, `pm25Grade` 파싱 및 정규화
  - **측정소 매핑 구현** (🔶#5 확정 규칙) — 산 위경도 → 최근접 측정소 자동 매핑, 거리 임계값 초과 시 "인근 측정소 없음" 처리, 매핑 결과 캐싱
  - Route Handler `GET /api/air-quality?mountainId=` 구현 — TTL 1시간 캐시
  - 실패 시 해당 변수를 점수 계산에서 제외하는 부분 폴백 신호 반환
  - **테스트 체크리스트**: Playwright MCP로 정상/측정소 없음/API 실패 3개 케이스 확인, 배지 등급 색상+텍스트 병기 확인
  - **산출물**: `app/api/air-quality/route.ts`, `lib/api/airkorea.ts`, `lib/geo/nearest-station.ts`
  - **의존성**: Task 015, Task 020

- **Task 022: 자외선 지수 연동 구현**
  - 기상청 생활기상지수 V5 자외선 클라이언트 구현 — `GET /1360000/LivingWthrIdxServiceV5/getUVIdxV5` (`areaNo` 행정구역코드, `time` YYYYMMDDHH 06·18시 발표), 응답 `h0`~`h75`(3시간 간격 UV 예보값) 파싱
  - Route Handler `GET /api/uv?mountainId=` 구현 — 캐시 TTL 적용
  - UV 구간 → 등급 라벨 매핑(낮음/보통/높음/매우높음/위험) 및 실패 시 부분 폴백 신호 반환
  - **테스트 체크리스트**: Playwright MCP로 UV 배지 렌더링 및 API 실패 시 배지 숨김/대체 문구 확인
  - **산출물**: `app/api/uv/route.ts`, `lib/api/kma-uv.ts`
  - **의존성**: Task 015, Task 020

- **Task 023: 컨디션 점수 산출 엔진 구현**
  - 100점 기준 감점 알고리즘 구현 (PRD 4.2 v1 가중치) — POP −25 / PTY −10 / TMP −20 / WSD −15 / 미세먼지 −20 / UV −10, **각 변수 선형 보간**, 합계 초과 시 0으로 클램프
  - 점수 → 등급/메시지 매핑 구현 (매우 좋음 80～100 / 좋음 60～79 / 보통 40～59 / 나쁨 20～39 / 위험 0～19)
  - `ScoreBreakdown` 산출 — 감점 기여도 상위 2～3개 요인을 근거로 반환
  - **부분 폴백** — 대기질/자외선 실패 시 해당 변수를 제외하고 계산, `excludedVariables` 표기 및 "일부 데이터 제외" 배지 노출
  - **서버에서만 계산**하고 `calc_version` 태깅 (🔶#10 확정안), `condition_scores` 캐시 테이블 저장/조회 (🔶#9 확정 방식)
  - **테스트 체크리스트**: 경계값 단위 검증(POP 30%/70%, TMP 5℃/22℃, WSD 7/14m/s, 감점 합계 >100), Playwright MCP로 게이지·등급·근거 렌더링 및 부분 제외 배지 확인
  - **산출물**: `lib/condition/score.ts`, `lib/condition/grade.ts`, `app/api/condition/route.ts`, `condition_scores` 캐시 연동
  - **의존성**: Task 021, Task 022, Task 014

- **Task 024: 장비 추천 규칙 엔진 구현**
  - PRD 4.2 규칙 테이블을 선언적 룰셋으로 구현 — POP≥50%/PTY 비·소나기 → 방수 자켓·레인커버, TMP≤5℃ → 방한 3종, TMP≥28℃ → 여벌 물·전해질·모자, UV≥6 → 선크림·선글라스·챙모자, WSD≥10m/s → 바람막이, 미세먼지 나쁨↑ → KF 마스크
  - 중복 장비 제거 및 우선순위 정렬, 각 추천에 발동 근거 문구 부착
  - 데이터 결측 변수의 규칙은 평가 제외 처리
  - `GearRecommendationList` 실데이터 연동
  - **테스트 체크리스트**: Playwright MCP로 조건 조합별(비+저온, 고온+고UV, 강풍+미세먼지) 추천 목록 정확성 확인
  - **산출물**: `lib/condition/gear-rules.ts`, `components/gear-recommendation-list.tsx` 연동
  - **의존성**: Task 023

- **Task 025: 인증 활성화 및 보호 라우트 정비**
  - 스타터킷 인증 흐름을 산길날씨 기준으로 정비 — `app/auth/*` 로그인/회원가입/비밀번호 재설정 카피 및 리다이렉트 경로 조정
  - `lib/supabase/proxy.ts`의 `updateSession()` 보호 경로에 `/favorites` 추가 (`/`, `/mountains/*`는 계속 비로그인 허용) — **쿠키 처리 로직은 변경 금지**
  - 서버 컴포넌트 이중 방어 — `/favorites`에서 `getClaims()` 재확인 후 미인증 시 `redirect("/auth/login")`
  - 로그인 폼은 기존 패턴 유지 (Client Component에서 `supabase.auth.*` 직접 호출)
  - 비로그인 사용자에게 즐겨찾기 클릭 시 로그인 유도 UX 연결
  - **테스트 체크리스트**: Playwright MCP로 비로그인 `/favorites` 접근 시 리다이렉트, 로그인 후 복귀, 로그아웃 후 세션 만료, 1단계 기능은 비로그인으로 계속 사용 가능한지 확인
  - **산출물**: `lib/supabase/proxy.ts`, `app/auth/*`, `app/favorites/page.tsx`
  - **의존성**: Task 002(#12), Task 020

- **Task 026: 즐겨찾기 기능 구현 (RLS 포함)**
  - `favorites` CRUD 구현 — 추가/삭제 토글, `(user_id, mountain_id)` 유니크 충돌 처리
  - `/favorites` 목록 조회 — 저장한 산 + 각 산의 최신 컨디션 점수 요약 동시 표시
  - **RLS 검증** — 타 사용자 `user_id`로 select/insert/delete 시도 시 모두 차단되는지 실제 쿼리로 확인
  - 낙관적 업데이트 및 실패 시 롤백, 비로그인 상태 처리
  - **테스트 체크리스트**: Playwright MCP로 추가→목록반영→삭제→목록반영 플로우, 중복 추가 방어, 두 계정 간 데이터 격리 확인
  - **산출물**: `app/api/favorites/route.ts`, `components/favorite-button.tsx` 연동, `app/favorites/page.tsx`
  - **의존성**: Task 025, Task 014, Task 023

- **Task 027: 2단계 완료 기준 검증 (통합 테스트)**
  - PRD 4.2 완료 기준 6항목 전수 검증 (Playwright MCP E2E)
    - 0～100 점수와 등급/메시지 표시
    - 주요 감점 요인 2～3개 근거 노출
    - 조건에 맞는 장비 추천 리스트 노출
    - 로그인 사용자의 즐겨찾기 추가/삭제
    - `favorites` RLS로 본인 데이터만 접근
    - 미세먼지/자외선 실패 시 해당 변수 제외 후 점수 계산(부분 폴백)
  - 알고리즘 회귀 검증 — 동일 입력 → 동일 점수(`calc_version` 고정 시), 버전 변경 시 캐시 무효화 확인
  - 엣지 케이스 — 전 소스 실패, 극단 기상값, 동시 즐겨찾기 토글
  - **산출물**: `docs/test-reports/phase4-condition.md`
  - **의존성**: Task 024, Task 026

---

### Phase 5: 3단계 구현 (지도 + PWA)

> **🔶#15 확정: 국립공원공단 `mountain.csv`로 등산로 좌표 확보(PoC 통과).** Task 029는 폴리라인 오버레이를 **정식 구현**한다(국립공원 범위). 국립공원 밖 산은 산 위치 마커 + 탐방로 목록으로 표시한다.

- **Task 028: 카카오맵 SDK 통합 구현**
  - 카카오맵 JS 키 발급 및 **도메인 등록**, CSP/스크립트 정책 확인
  - `KakaoMap` Client Component 구현 — SDK **지연 로딩**(`next/script` `lazyOnload` 또는 동적 로드), 지도 인스턴스 생명주기 관리 및 언마운트 정리
  - `mountains.lat/lng` 기반 산 위치 마커 및 초기 줌 레벨 설정
  - `/mountains/[id]` 지도 섹션 및 `/mountains/[id]/map` 전체화면 지도 연결
  - **스크립트 로드 실패 폴백** — 정적 좌표 텍스트 + 외부 지도 링크 제공
  - **테스트 체크리스트**: Playwright MCP로 지도 렌더링, 스크립트 차단 시 폴백 노출, 지도 로딩이 LCP를 저해하지 않는지 확인
  - **산출물**: `components/kakao-map.tsx`, `app/mountains/[id]/map/page.tsx`
  - **의존성**: Task 001(#15), Task 027

- **Task 029: 등산로 GeoJSON 적재 및 오버레이 구현**
  - `mountain.csv` 좌표(WGS84 위경도) → 코스별 그룹핑 → **RDP 단순화**(허용오차 ～3m, PoC로 유효성 확인) → GeoJSON LineString 변환 파이프라인 (Task 017의 CSV 파서 재사용, 재투영 불필요)
  - `trails.path_geojson` 적재 — 필요 코스만 (원본 173MB는 로컬 가공용, DB 적재분은 수 MB 예상), 스키마 변경 시 `database.types.ts` 재생성
  - `TrailOverlay` 구현 — 카카오맵 폴리라인으로 코스 렌더링
  - **통제 구간 색상 구분** — `trails.status`별 폴리라인 색상 및 `MapLegend` 연동 (색상 단독 구분 금지: 범례 텍스트 병기)
  - 국립공원 외(GeoJSON 미보유) 탐방로는 마커+목록으로만 표시하는 축소 폴백
  - **테스트 체크리스트**: Playwright MCP로 폴리라인 렌더링, 통제 구간 색상 구분, GeoJSON 없는 산의 폴백 동작 확인
  - **산출물**: `components/trail-overlay.tsx`, `components/map-legend.tsx`, `lib/trails/csv-to-geojson.ts`, `supabase/migrations/*_trails_geojson.sql`
  - **의존성**: Task 028, Task 017 (CSV 파서 재사용)

- **Task 030: PWA 적용 및 오프라인 폴백 구현**
  - `app/manifest.ts`(또는 `manifest.json`) 작성 — 확정 브랜드명(🔶#1), 테마 색상, `display: standalone`, 아이콘 세트(192/512/maskable) 생성
  - 서비스워커 구현 — 🔶#13 확정 전략(앱 셸 캐시 + 데이터 네트워크 우선), 버전 관리 및 구버전 캐시 정리
  - `PwaInstallPrompt` 동작 구현 — `beforeinstallprompt` 캡처, 설치 배너 노출/디스미스 상태 저장
  - 오프라인 폴백 — `/offline` 라우팅 및 **마지막 조회 결과 캐시 표시**("N분 전 기준" 라벨 재사용)
  - Lighthouse PWA 항목 점검
  - **테스트 체크리스트**: Playwright MCP로 오프라인 전환 시 캐시 결과/`/offline` 노출, 서비스워커 등록 및 갱신 확인
  - **산출물**: `app/manifest.ts`, `public/sw.js`, `public/icons/*`, `app/offline/page.tsx`, `components/pwa-install-prompt.tsx`
  - **의존성**: Task 002(#1), Task 003(#13), Task 027

- **Task 031: 3단계 완료 기준 검증 (통합 테스트)**
  - PRD 4.3 완료 기준 5항목 전수 검증 (Playwright MCP E2E)
    - 산 상세에서 카카오맵과 등산로 폴리라인 표시
    - 통제 구간 색상 구분(데이터 보유 시)
    - Android Chrome "홈 화면에 추가" 동작
    - 오프라인 시 마지막 조회 결과 또는 오프라인 안내 표시
    - 지도 스크립트 로드 실패 시 정적 좌표/링크 폴백 제공
  - 지도 도입 후 성능 회귀 검증 — 상세 페이지 LCP 유지 확인
  - **산출물**: `docs/test-reports/phase5-map-pwa.md`
  - **의존성**: Task 029, Task 030

---

### Phase 6: 품질·성능·운영

- **Task 032: 성능 최적화 (LCP 2.0s 목표)**
  - 결과 페이지 LCP 모바일 4G 기준 **2.0s 이하** 달성 — 히어로 영역 서버 렌더링 우선, 폰트/이미지 최적화, 번들 분석 후 클라이언트 컴포넌트 축소
  - 외부 API 캐시 히트율 측정 및 TTL 재조정 (🔶#8 실측 확정)
  - 지도·무거운 스크립트 지연 로딩 재검증, 불필요한 리렌더 제거
  - **테스트 체크리스트**: Playwright MCP로 4G 스로틀링 하 LCP·CLS 측정, 캐시 히트/미스 응답 시간 비교
  - **산출물**: 성능 측정 리포트, 최적화 커밋
  - **의존성**: Task 031

- **Task 033: 접근성·에러/로딩 폴백 전면 감사**
  - PRD 7장 기준 전수 감사 — 색상 단독 구분 금지, 터치 타깃 44x44px, 폼 라벨/`aria` 속성, 점수 게이지 텍스트 병기
  - **모든 데이터 페칭 구간**에 스켈레톤/로딩 표시 존재 확인
  - 모든 에러 경로에 사용자 친화 메시지 + 재시도 버튼 존재 확인
  - 폴백 매트릭스 검증 — 날씨/탐방로/대기질·자외선/지도 각 실패 시나리오별 PRD 명시 동작 일치 여부
  - 스크린리더 기본 흐름 점검
  - **산출물**: `docs/test-reports/a11y-fallback-audit.md`
  - **의존성**: Task 031

- **Task 034: 계측·모니터링 및 배포 파이프라인 구축**
  - KPI 계측 — 주간 검색 세션 수, 검색→결과 확인 완료율, 외부 API 성공률, 7일 재방문율, 즐겨찾기 등록 비율, PWA 설치 전환율
  - 외부 API 성공률/응답시간 로깅 및 실패 알림 기준 수립 (목표: 1단계 95% → 3단계 98%)
  - 환경변수·시크릿 관리 점검 (외부 API 키의 서버 전용 노출 재확인), `mcp__supabase__get_advisors` 보안 경고 0건
  - 빌드/린트/타입 체크 CI 구성 (`npm run build`, `npm run lint`, `npx tsc --noEmit`) 및 프로덕션 배포
  - **산출물**: 계측 코드, CI 설정, 운영 대시보드 기준 문서
  - **의존성**: Task 032, Task 033

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
| 034  | 032, 033      | —             |

**병렬 개발 라인**

- **UI 라인 (Phase 2)**: Task 008～013 — 더미 데이터만 사용하므로 백엔드 라인과 완전 독립
- **백엔드 라인 (Phase 3～4)**: Task 014～018, 021～024 — 외부 API·DB·점수 엔진
- **인증 라인**: Task 025～026 — Task 020 이후 점수 엔진과 병렬 진행 가능

---

## 리스크 및 대응

| 리스크                                            | 영향                            | 대응                                                                                            |
| ------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| 🔶#4 탐방로 데이터: 정적 스냅샷·국립공원 한정 | 돌발 통제 미반영, 국립공원 외 산 공백 | (소스 확보) 계절 통제는 기간 계산으로 반영, 데이터 기준일 표기, 국립공원 외는 "정보 없음" 폴백(정식 스펙), 필요 시 라이브 개방정보 보완 |
| 🔶#15 등산로 GeoJSON                              | (해소) 국립공원공단 CSV로 좌표 확보·PoC 통과 | Task 029 폴리라인 오버레이 정식 구현; 코스 조립 키 정의 필요; 광역 확장 시 산림청 전국등산로표준데이터(15029184) 추가 검토 |
| 공공 API 호출 쿼터/장애 (기상·대기·자외선)        | 서비스 신뢰성 목표(95～98%) 미달 | Task 015의 서버 캐싱 일원화 + stale 응답 폴백("N분 전 기준"), Task 034에서 성공률 상시 모니터링 (탐방로는 정적 CSV라 쿼터 무관) |
| 기상청 격자 변환 정확도                           | 잘못된 지역 날씨 표출           | Task 014에서 변환 유틸 단위 검증 + 시드 데이터 샘플 교차 확인                                   |
| 컨디션 점수 가중치 부정확                         | 사용자 신뢰 하락                | `calc_version` 태깅으로 버전별 비교, 베타 피드백 기반 튜닝(🔶#11)                               |
| 카카오맵 SDK가 LCP 저해                           | 성능 KPI 미달                   | Task 028 지연 로딩 + Task 032 성능 회귀 검증                                                    |
