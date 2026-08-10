# 로드맵 — Phase 3~4 (1·2단계 MVP)

> [← ROADMAP 허브](../ROADMAP.md) · 날씨+탐방로 실데이터 → 컨디션 점수+장비추천+인증/즐겨찾기 (Task 014~027).
> 상태 표기 규칙·개발 워크플로우·Phase↔PRD 매핑은 허브를 참조하세요.

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

