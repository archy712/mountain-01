# Task 036: 100대명산 목록 화면

> Phase 7 (개인화·콘텐츠 확장) / 우선순위
> 산림청 100대명산을 산 마스터에 편입하고, 지역·고도로 정렬/필터하는 전용 목록 화면을 제공한다.

## 목표

현재 산 마스터(`mountains`)는 30종(국립공원 산악형 + 근교/도립산)만 담고 있다. 이를 **산림청 100대명산**까지 확장하고, 사용자가 100대명산을 한눈에 훑고 상세로 진입할 수 있는 **목록 화면**을 붙인다. 거의 불변 콘텐츠이므로 기존 `'use cache'`(mountains 프로필)·스켈레톤·접근성 로딩 패턴을 그대로 재사용한다.

## 배경 및 컨텍스트

- 산 마스터 스키마: `supabase/migrations/20260808120000_sangil_core_schema.sql` (`mountains` = id/name/region/altitude/lat/lng/grid_nx/grid_ny/created_at, RLS 공개 select·쓰기 차단).
- 시드 생성기: `supabase/seed/gen-mountains.mjs` — slug·이름·지역·고도·위경도 배열에서 기상청 격자(nx/ny)를 사전 계산하고 결정론적 UUID v5로 `mountains.sql`을 출력(재실행 멱등). **100대명산 확장은 이 배열을 늘리고 플래그를 추가하는 방식**으로 한다.
- 데이터 액세스: `lib/data/mountains.ts`(`getAllMountains`·`getPopularMountains`, `'use cache'` + `mountains-1d`/`search-1h` 프로필). 홈 인기 산 그리드가 이 계층을 소비(`components/popular-mountains.tsx`).
- 데이터 출처/라이선스: `docs/decisions/001-data-sources.md`(국립공원공단 CSV·표준데이터 이용범위 확인 항목 존재). **100대명산 "선정 목록" 자체와 좌표 출처의 라이선스를 이 문서 기준으로 재확인**하고 필요 시 항목을 갱신한다.

## 설계 결정 (이 Task에서 확정)

- **DB**: `mountains`에 `is_top100 boolean not null default false` 컬럼 추가. (별도 테이블 대신 플래그 — 100대명산은 산 마스터의 부분집합이고 조회가 단순 필터라 정규화 이득이 없음.)
- **화면**: **전용 `/top100` 라우트**를 신설한다(홈 섹션 대신). 100개 항목은 홈 "결론 우선" 위계를 해쳐서, 홈에는 `/top100` 진입점(링크/카드)만 둔다.
- **정렬/필터**: 지역(칩 필터) + 고도(오름/내림 정렬)를 클라이언트 인터랙션으로 처리. 서버는 `is_top100=true` 목록을 캐시로 넘기고, 필터/정렬 상태만 클라이언트 컴포넌트가 관리(데이터 재요청 없음).
- **각 항목**: 탭 시 기존 산 상세(`/mountains/[id]`)로 직결. 카드 마크업은 `popular-mountains.tsx` 패턴 재사용(이름·지역·고도, 44px 터치 타깃, 색상 단독 구분 금지 규약).
- **컨디션 점수 미표시**: `/top100` 목록에는 **이름·지역·고도 메타만** 노출하고 컨디션 점수·날씨 칩은 붙이지 않는다. 즐겨찾기는 소수라 카드별 스트리밍(`favorite-score.tsx`)이 성립하지만, 100종에 점수를 붙이면 항목당 외부 API가 호출돼(100종 × 날씨·대기·자외선) 호출량이 폭증한다. 점수·날씨는 상세 진입 후 계산한다.

## 관련 파일

**신규**

- `supabase/migrations/20260809160000_mountains_top100_flag.sql` — `is_top100` 컬럼 추가(멱등, `add column if not exists`).
- `app/(main)/top100/page.tsx` — 100대명산 라우트(서버 컴포넌트, `<Suspense>` + 스켈레톤 폴백).
- `components/top100-list.tsx` — 목록/정렬/필터 UI(클라이언트, 서버에서 데이터 prop 주입).
- `lib/data/top100.ts` **또는** `lib/data/mountains.ts`에 `getTop100Mountains()` 추가(`'use cache'` + `mountains` 프로필, `is_top100` 필터).

**수정**

- `supabase/seed/gen-mountains.mjs` — 배열에 `is_top100` 플래그 필드 추가 + 100대명산 항목 확장, INSERT/`on conflict` 컬럼에 `is_top100` 반영.
- `supabase/seed/mountains.sql` — 생성기 재실행 산출물(수기 편집 금지).
- `lib/supabase/database.types.ts` — 스키마 변경 후 `mcp__supabase__generate_typescript_types`로 재생성(스타터 `profiles` 수동 보존 블록 주의 — Task 014 주석 참조).
- `app/(main)/page.tsx` 또는 `components/site-header.tsx` — 홈/헤더에 `/top100` 진입점 추가.
- `docs/decisions/001-data-sources.md` — 100대명산 목록·좌표 출처/라이선스 확인 결과 반영(필요 시).

## 구현 단계

- [x] **1. 데이터 확보 및 라이선스 확인** — 산림청 100대명산 목록(이름/지역/대표 고도/정상 위경도)을 확보하고, `docs/decisions/001-data-sources.md` 기준으로 출처·이용범위(라이선스)를 확인·기록한다. 기존 30종 중 100대명산 해당분을 식별한다.
- [x] **2. 마이그레이션 작성·적용** — `is_top100 boolean not null default false` 컬럼을 멱등 추가하는 마이그레이션 작성 후 `mcp__supabase__apply_migration` 적용. `list_tables`로 컬럼 반영 확인.
- [x] **3. 시드 생성기 확장** — `gen-mountains.mjs` 배열에 `is_top100` 필드 추가 + 100대명산 신규 항목 입력(격자 변환·roundtrip 단위 검증 통과 유지). INSERT 컬럼과 `on conflict do update`에 `is_top100` 포함. 재실행해 `mountains.sql` 재생성.
- [x] **4. 시드 적재** — 확장된 `mountains.sql`을 원격 DB에 적재(서비스롤). id는 slug 기반 UUID v5라 기존 30종은 멱등 갱신, 신규분만 삽입됨을 확인. `get_advisors` 경고 0건 확인.
- [x] **5. 타입 재생성** — `mcp__supabase__generate_typescript_types`로 `lib/supabase/database.types.ts` 재생성(`profiles` 수동 블록 보존).
- [x] **6. 데이터 액세스 계층** — `getTop100Mountains()` 구현(`'use cache'` + `mountains` 프로필 + `sourceTag("mountains")`, `is_top100=true` 필터, 지역·이름 기본 정렬). `MountainSuggestion`에 고도가 이미 포함되어 정렬용 필드 충족.
- [x] **7. 목록 UI** — `top100-list.tsx`(클라이언트): 지역 칩 필터 + 고도 정렬 토글, 카드 그리드(`popular-mountains.tsx` 재사용), 빈 필터 결과 폴백. 색상 단독 구분 금지·44px 터치 타깃·키보드 접근성 준수.
- [x] **8. 라우트 + 진입점** — `app/(main)/top100/page.tsx`(서버, `<Suspense>` 스켈레톤 폴백 = 홈 인기 산 패턴 재사용) 신설 + 홈/헤더에 진입점 추가.
- [x] **9. 검증** — 아래 테스트 체크리스트 수행 후 `npm run typecheck`·`lint`·`build` 통과 확인.

## 수락 기준

- [x] `mountains.is_top100` 컬럼이 원격 DB에 존재하고 100대명산 행만 `true`로 표시된다.
- [x] 산 마스터가 100대명산을 커버하도록 확장되었고, 기존 30종은 멱등 갱신되어 id·상세 링크가 깨지지 않는다.
- [x] `/top100`에서 100대명산이 목록으로 노출되고, 지역 필터·고도 정렬이 데이터 재요청 없이 동작한다.
- [x] 각 항목 탭 시 해당 산 상세(`/mountains/[id]`)로 직결된다.
- [x] 목록 카드에는 이름·지역·고도 메타만 노출되고 컨디션 점수·날씨 칩은 없다(외부 API 호출 0건).
- [x] 홈 또는 헤더에서 `/top100` 진입점이 노출된다.
- [x] 목록은 `'use cache'`로 캐시되고, 로딩 시 스켈레톤 + `role="status"`/sr-only 라벨 + `LoadingBar` 관례를 따른다.
- [x] 360px 폭에서 가로 오버플로 0px, 색상 단독 구분 없음(지역·고도 텍스트 병기).
- [x] `typecheck`·`lint`·`build` 통과, 앱 콘솔 JS 에러 0건.

## 테스트 체크리스트 (Playwright MCP, 360px 우선)

- [x] `/top100` 진입 → 100대명산 목록 렌더, 초기 로딩 시 스켈레톤 → 데이터 fade-in 확인.
- [x] 지역 칩 필터 선택 → 해당 지역 산만 노출, 해제 시 전체 복귀(네트워크 재요청 없음).
- [x] 고도 정렬 토글(오름/내림) → 순서 정확 변경, 필터와 조합 동작 확인.
- [x] 목록 항목 탭 → 올바른 `/mountains/[id]` 상세로 이동, 상세 정상 렌더.
- [x] 홈/헤더 진입점 → `/top100` 이동 확인.
- [~] 필터 결과 0건 상태 → 빈 상태 폴백 문구 노출(빈 그리드 아님). *(방어 코드로 구현·존치하나, 지역 칩이 데이터에 실재하는 지역만 렌더하므로 UI로는 0건이 발생하지 않아 트리거 불가 — 코드 인스펙션으로 갈음.)*
- [x] 키보드 내비게이션(Tab/Enter)으로 필터·정렬·항목 이동 가능, 포커스 링 가시.
- [x] 콘솔 에러 0건, 360/390/768px 뷰포트 가로 오버플로 없음.
- [x] DB 검증: `execute_sql`로 `select count(*) from mountains where is_top100` 값이 목록 개수와 일치.

## 산출물

- `supabase/migrations/20260809160000_mountains_top100_flag.sql`
- `supabase/seed/gen-mountains.mjs`(확장), `supabase/seed/mountains.sql`(재생성)
- `lib/data/top100.ts` 또는 `lib/data/mountains.ts`(`getTop100Mountains`)
- `app/(main)/top100/page.tsx`, `components/top100-list.tsx`
- 홈/헤더 진입점 수정(`app/(main)/page.tsx` 또는 `components/site-header.tsx`)
- `lib/supabase/database.types.ts`(재생성)
- `docs/decisions/001-data-sources.md`(출처/라이선스 반영, 필요 시)

## 의존성 및 리스크

- **선행 의존성**: Task 014(산 마스터 시드·격자 변환·RLS), Task 018(검색/데이터 액세스 계층). 둘 다 완료.
- **병렬 가능**: Task 037(방문완료)과 상호 독립.
- **리스크**:
  - 100대명산 목록·좌표 출처의 라이선스 불명확 → 착수 1단계에서 확인·기록(미확인 시 표시 방식/출처 표기 조정).
  - 신규 산의 격자 변환 정확도 → 생성기 roundtrip 자기일관성 검증으로 방어(Task 014 패턴).
  - 신규 산은 탐방로/좌표 GeoJSON(Task 017/029) 데이터가 없어 상세에서 "정보 없음" 폴백 → 정식 스펙(기존 커버리지 폴백과 동일).
