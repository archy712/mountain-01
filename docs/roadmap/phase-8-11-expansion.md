# 로드맵 — Phase 8~11 (확장)

> [← ROADMAP 허브](../ROADMAP.md) · 보유 데이터 고도화 → 신규 소스 → 정적 시드 콘텐츠 → 고비용 후순위 (Task 039~050).
> **현재 진행/예정 작업이 있는 파일입니다.** 상태 표기·워크플로우·의존성은 허브 참조.

### Phase 8: 판단·개인화 고도화 (신규 소스 불필요)

> 이미 앱이 보유한 데이터(시간별 예보 `getWeatherForecast`·`visited`·`is_top100`·산 메타·탐방로 난이도)만으로 구현한다. **신규 외부 API·시드가 필요 없어 난이도가 낮고**, 핵심 가치("갈까 말까")를 "언제/어디로"까지 확장하는 고효율 확장 라인. Task 039～042는 상호 독립이라 병렬 진행 가능하다.

- **✅ Task 039: 오늘 시간대별 컨디션 추이 ("언제 가면 좋은지")** - 완료
  - **개요**: 상세 화면에 앞으로의 시간대별 컨디션 점수 추이를 막대 그래프로 노출해 "가라/말라"를 "**언제 가라**"로 확장한다. Task 034 `getWeatherForecast`의 시간별 예보를 슬롯별 점수로 환산하며, 컨디션 히어로·날씨 섹션과 **동일 캐시 키를 재사용**해 추가 외부 네트워크가 없다.
  - **수락 기준**:
    - [x] 앞으로의 시간대별 컨디션 점수/등급을 막대로 시각화(각 막대에 점수 숫자 병기 + sr-only "N시 등급 N점" 텍스트 대안 → 색상 단독 금지 준수).
    - [x] 가장 좋은 시각을 "추천" 마커 + "오전 9시경이 가장 좋아요" 문장으로 강조.
    - [x] 추가 외부 API 호출 0 — `getWeatherForecast`·`getAirQuality`·`getUvIndex`가 히어로/날씨 섹션과 같은 `'use cache'`/`withStaleFallback` 키를 히트(라이브 콘솔 에러 0).
    - [x] 예보 실패 시 추이 섹션만 숨김(`hasData` 가드) — 날씨 카드가 별도 실패 안내, 타 섹션 독립 렌더.
    - [x] 360px 레이아웃 깨짐 0(막대는 `overflow-x-auto` 컨테이너 내 스크롤). 모션 애니메이션 미사용이라 motion-reduce 이슈 없음.
  - **구현 단계**:
    - [x] 슬롯별 점수 환산 순수 함수 `computeHourlyConditionTrend`(`lib/condition/hourly.ts`) — 기존 `computeConditionScore` 재사용, 프레임워크 무의존.
    - [x] 시간 해상도 낮은 대기질·자외선은 스냅샷 값을 전 슬롯 공통 적용(근거 주석). 시간별 풍속 감점을 위해 `HourlyForecast`에 `windSpeedMs` 추가(`buildHourlyForecast`가 WSD 캡처).
    - [x] 오케스트레이터 `getConditionTrendForMountain`(`lib/condition/service.ts`) — 예보+대기+자외선 병렬 조회, stale 승계, 점수 DB 미저장(파생 뷰).
    - [x] 표현 컴포넌트 `components/hourly-condition-trend.tsx`(막대·최적 시각 강조·sr-only 대안). 상세 페이지 독립 `<Suspense>` + 실제 높이 스켈레톤(`ConditionTrendSkeleton`, CLS 회피)으로 스트리밍 삽입.
    - [x] 단위 검증 11/11 통과(쾌적 vs 우천 점수·동점 이른 시각 best·빈 예보·limit·풍속 슬롯값·WSD 캡처/결측 폴백).
  - **테스트 체크리스트 (Playwright MCP)**:
    - [x] 라이브(북한산 360px): 컨디션 히어로(95) ↔ 날씨 섹션 사이에 추이 렌더, 9시 95(추천)→16시 88 하강(오후 고온), "오전 9시경이 가장 좋아요" 확인. 엔진과 수치 일치(31℃→−12→88).
    - [x] 우천 케이스는 단위 테스트로 검증(라이브는 당일 전국 맑음). "전 슬롯 낮음" 경로 확인.
    - [x] 서버가 히어로/날씨와 캐시 공유(동일 키)로 추가 외부 호출 없음 — 구조적 보장 + 라이브 콘솔 에러 0.
    - [x] 콘솔 에러/경고 0, `typecheck`·`lint`·`build` 통과.
  - **산출물**: ✅ `lib/condition/hourly.ts`, `lib/condition/{service,index}.ts`, `components/hourly-condition-trend.tsx`, `app/(main)/mountains/[id]/page.tsx`(섹션·스켈레톤), `lib/types/{weather,condition}.ts`, `lib/api/kma-forecast-core.ts`(WSD 캡처)
  - **후속(안전 출발/일몰)**: 왕복이 긴 산은 컨디션만 보고 늦은 시각을 추천하면 일몰 뒤 하산 위험(예: 한라산 정오 추천→9시간이면 밤 9시 종료). **개방 코스 왕복시간 상위 80퍼센타일 + 일몰**로 "안전 출발 마감"을 계산해 추천을 일몰 전 하산 가능한 시간대로 제한하고, 늦은 시간대는 달 아이콘·흐린 막대로 표시 + 하단 안내 문구 추가. p80 채택으로 초장거리 종주 1개(북한산 13km)가 오후 전체를 왜곡하는 문제 회피. 공식 입산통제 시각 데이터는 없어 일몰 기준 파생(향후 큐레이션 소스로 정밀화 여지). 라이브 검증: 한라산(왕복 9h→전 시간대 '일몰 후'·이른 출발 권장)·북한산(왕복 3h10m→오후 3시 22분까지 안전). 단위 19/19. `lib/data/mountain-detail.ts`(코스 소요)·`lib/geo/sun-times.ts`(일몰) 재사용, 추가 외부 호출 0
  - **의존성**: Task 034(확장 예보), Task 023(점수 엔진), Task 017(탐방로 소요시간)

- **✅ Task 040: 산행 기록 통계 & 100대명산 진척** - 완료
  - **개요**: `visited` + `is_top100`을 집계해 **방문완료 화면 상단**에 "다녀온 산 수·올해 방문 수·**100대명산 진척(N/100)**·지역 분포"를 노출한다. 외부 API 없이 방문 기록만으로 즉시 렌더돼 재방문율 KPI(7일 재방문·PRD 2장)를 뒷받침한다. **배치는 `/visited`**(기록 화면이라 가장 문맥적, 마이페이지는 이미 개수 배지 보유).
  - **수락 기준**:
    - [x] 방문 목록 상단에 총 방문 수·올해 방문 수·100대명산 진척(N/100)·지역 분포가 표시된다(라이브: 3곳·3곳·2/100·강원1·서울1·서울·경기1).
    - [x] 100대명산 진척은 `visited`↔`is_top100` 교집합으로 계산(RLS 본인 행만). `is_top100` FK 임베드로 별도 쿼리 없이 산출.
    - [x] 방문 0건일 때 통계 패널을 숨기고 목록의 빈 상태 안내가 렌더된다(라이브 확인).
    - [x] 외부 API 미사용 — DB 한 번 조회로 목록·통계를 함께 산출, 즉시 렌더.
    - [x] 색상 단독 금지: 진척은 막대 + "2 / 100 (2%)" 숫자 + `role="progressbar"` aria, 지역은 칩에 개수 병기.
  - **구현 단계**:
    - [x] 순수 집계 함수 `computeVisitedStats`(`lib/data/visited-stats.ts`) — total·올해(KST 연도)·top100 교집합·지역 group by(내림차순·동수 가나다), 진척 상한 방어.
    - [x] `VisitedStats` + `VisitedStatsSkeleton` 표현 컴포넌트(타일 3 + 진척 바 + 지역 칩, CLS 회피 스켈레톤).
    - [x] `/visited` 조회를 목록+통계 겸용으로 확장(`is_top100` 임베드), 패널을 목록 위에 삽입, Suspense 폴백에 통계 스켈레톤 정합.
    - [x] 경계 단위 검증 15/15(0건·비-100대명산만·연도 KST 경계·지역 정렬·진척 상한 클램프).
  - **테스트 체크리스트 (Playwright MCP)**:
    - [x] 로그인 후 방문 3건 등록(북한산·설악산·남산) → 통계·진척·지역 분포 정확 표시(엔진 예측과 일치), 목록 3건 노출.
    - [x] RLS 로 본인 3행만 집계됨 확인(다른 계정 데이터 미혼입).
    - [x] 3건 인라인 해제 → 재조회 시 빈 상태·통계 패널 숨김 확인(테스트 데이터 정리 완료). 콘솔 에러 0, `typecheck`·`lint`·`build` 통과.
  - **산출물**: ✅ `lib/data/visited-stats.ts`, `components/visited-stats.tsx`, `app/(main)/visited/page.tsx`(통계 삽입·조회 확장)
  - **의존성**: Task 036(100대명산·`is_top100`), Task 037(방문완료)

- **✅ Task 041: 산 상세 공유 (Web Share / 링크 복사)** - 완료
  - **개요**: 상세 화면을 OS 공유 시트(Web Share API)로, 미지원 시 링크 클립보드 복사로 공유하는 버튼을 헤더 액션 슬롯(공유·방문완료·즐겨찾기)에 추가. 백엔드 없이 동작하며 활성도(신규 유입) KPI 를 뒷받침한다. 공유는 best-effort 로 계측한다.
  - **수락 기준**:
    - [x] 공유 버튼 클릭 시 지원 브라우저에서 `navigator.share` 로 OS 공유 시트를 연다(라이브 스텁 검증: 정확한 title/text/url 페이로드).
    - [x] Web Share 미지원 시 링크를 클립보드에 복사하고 "링크가 복사됐어요" 토스트(`role="status"`)를 노출한다(라이브 검증).
    - [x] 공유 URL 이 해당 산 상세 URL 이고, OG 제목/설명·canonical 이 산 이름·지역 기준으로 노출된다(라이브: `og:title`·`og:description`·`og:url`·canonical 절대 URL 확인).
    - [x] 터치 타깃 44×44px, 접근성 이름(`{산이름} 공유하기`) 완비.
  - **구현 단계**:
    - [x] `navigator.share` 지원 감지 + 클립보드 폴백 클라이언트 컴포넌트(`components/share-button.tsx`, AbortError=취소는 무시). 세션 무관이라 정적 셸에서 즉시 렌더(스트리밍 대기 없음).
    - [x] 상세 `generateMetadata` 에 산별 description·openGraph(title/description/url/type)·canonical 보강(metadataBase 로 절대 URL 해석).
    - [x] `mountain_share` 계측 이벤트를 클라이언트 타입·API 화이트리스트·**DB CHECK 제약** 3곳에 추가(props.method= web_share|clipboard, Task 037 패턴).
  - **테스트 체크리스트 (Playwright MCP)**:
    - [x] Web Share 스텁으로 공유 시트 트리거·페이로드 검증 + `mountain_share`(web_share) 계측 확인.
    - [x] `navigator.share=undefined` 시뮬레이션 → 클립보드 복사·토스트·`mountain_share`(clipboard) 확인. `analytics_events` 적재 전수 확인(마이그레이션 CHECK 통과) 후 테스트 telemetry 정리.
    - [x] 콘솔 에러 0, `typecheck`·`lint`·`build` 통과.
  - **산출물**: ✅ `components/share-button.tsx`, `app/(main)/mountains/[id]/page.tsx`(공유 버튼·OG 보강), `lib/analytics/client.ts`·`app/api/analytics/route.ts`(이벤트 화이트리스트), `supabase/migrations/20260810000000_analytics_share_event.sql`(적용됨)
  - **의존성**: Task 019(상세 실연동), Task 035(계측 인프라)

- **✅ Task 042: 산 추천 (지역·고도·난이도 필터)** - 완료
  - **개요**: `mountains`의 지역·고도 + 탐방로 난이도(Task 034 소요시간 기반 별점)로 "이런 산 어때요?" 필터형 추천을 제공한다. 신규 소스 없음. PRD 10장 "지역/난이도/거리 기반 산 추천".
  - **관련 파일**: 신규 `lib/data/recommend.ts`(필터 후보 쿼리·`'use cache'`), `lib/trails/summary.ts`(대표 난이도 파생 추가), 신규 `components/mountain-recommend.tsx`, 신규 `/discover` 라우트(`app/(main)/discover/page.tsx`), `lib/supabase/proxy.ts`(공개 경로 편입), `app/(main)/page.tsx`(홈 진입 배너)
  - **수락 기준**:
    - [x] 지역·고도대·난이도 조합으로 산 목록을 필터링할 수 있다(클라이언트 필터, 데이터 재요청 없음). 라이브 검증: 강원+힘든편 → 오대산·설악산 2곳 교차 정확.
    - [x] 100대명산 목록처럼 컨디션 점수는 미표시로 외부 호출 폭증을 방지한다(메타+대표 난이도 별점만 노출).
    - [x] 결과 없음 빈 상태("조건에 맞는 산이 없어요")·색상 단독 금지(별 형태+텍스트 라벨 병기)·키보드 접근성(`aria-pressed`)을 준수한다.
  - **구현 단계**:
    - [x] 추천 후보 데이터 계층(`getRecommendMountains`, `mountains`+`trails.go_minutes` 조인해 산별 대표 난이도 중앙값 파생) `'use cache'`(mountains-1d, `mountains`·`trails` 태그)로 구성.
    - [x] 필터 UI(지역·고도대·난이도 칩) + 정렬(이름/고도/난이도) 클라이언트 컴포넌트(`MountainRecommend`), 미상 난이도는 항상 후순위 정렬.
    - [x] 전용 `/discover` 라우트 배치(홈 진입 배너 추가), 로딩 스켈레톤·`LoadingBar` 관례 재사용, `proxy.ts` 공개 경로 편입.
  - **구현 노트**:
    - **대표 난이도 = 코스 오름시간 별점의 중앙값**(`representativeDifficulty`). 최댓/최솟값은 극단 코스 하나에 왜곡되므로 중앙값으로 "이 산의 전형적 난이도"를 표현. 탐방로 미보유 산(국립공원 외)은 "난이도 정보 없음"(전체 105곳 중 코스 보유 16곳만 별점).
    - 난이도 3구간(쉬운 편 1~2 / 보통 3 / 힘든 편 4~5), 고도 4구간(500m 미만/500~1000/1000~1500/1500m 이상, min 이상·max 미만 경계).
  - **테스트 체크리스트 (Playwright MCP)**:
    - [x] 지역·고도·난이도 필터 조합 결과 정확성(경계값 포함) 확인 — 쉬운편 4곳(전원 쉬움), 강원+힘든편 2곳(오대산 매우어려움·설악산 어려움), 고도 500m 미만 12곳(최대 495m, 500 이상 배제), 조합 0곳 빈 상태.
    - [x] 추천 카드 → 상세 이동·실날씨 연동(북한산 상세 진입), 360/768px 가로 오버플로 0, 콘솔 에러 0(초기 관측 에러는 stale dev 서버 청크였고 재시작 후 0), `typecheck`·`lint`·`build` 통과.
  - **의존성**: Task 014(산 마스터), Task 034(난이도)

- **✅ Task 051: 날씨 "지금" 정확도 개선 — 초단기실황 보정** - 완료
  - **개요**: 단기예보(`getVilageFcst`, 3시간 간격·발표 지연)만 쓰던 "지금" 기온·습도·풍속·강수형태를 **같은 서비스(`VilageFcstInfoService_2.0`)의 초단기실황(`getUltraSrtNcst`, 매시각 실측)으로 보정**한다. 결정 001 #3의 "혼용" 원안이며 Task 016에서 보류한 항목. **신규 키·신규 소스 불필요**(기존 `KMA_SERVICE_KEY`, 쿼터 10,000/일).
  - **관련 파일**: ✅ `lib/api/kma-forecast-core.ts`(초단기 base_time·정규화·병합 순수 로직), `lib/api/kma-forecast.ts`(초단기 fetch + 스냅샷/예보 current 보정), `scratchpad/test-ncst.ts`(단위 검증). 소비부(상세/홈/컨디션)는 기존 진입점 그대로 재사용
  - **수락 기준**:
    - [x] "지금 날씨"의 현재값(기온·습도·풍속·강수형태)이 초단기실황(실측) 기준으로 보정된다. 라이브: 북한산 `/api/weather` tempC=29.6(실황 T1H), 상세 히어로 30℃(단기예보 TMP 29 아님)로 실증.
    - [x] 초단기실황에 없는 POP·SKY·최저/최고·3일 예보는 기존 단기예보 값을 유지한다(소스 병합).
    - [x] 초단기 소스 실패 시 단기예보 단독으로 폴백한다(부분 폴백, 독립 `withStaleFallback`+`obs=null` no-op 병합), 앱 크래시 0.
    - [~] 시간대별 추이(Task 039) 앞부분 초단기예보(`getUltraSrtFcst`) 정밀화는 **선택 항목이라 후속으로 분리**(현재는 실황 현재값 보정까지).
    - [x] 발표주기에 맞는 캐싱(weather-30m, 초단기 캐시 키 `weather:...:ncst`)으로 쿼터 낭비 없음.
  - **구현 노트**:
    - 병합 규칙: 기온(T1H)·습도(REH)·풍속(WSD)·강수형태(PTY)는 실측이 있으면 교체(없으면 예보 유지), 체감온도 재계산. POP·SKY·TMN/TMX·3일예보는 예보 유지.
    - 초단기실황 base_time: 매시 정시 관측, 제공 지연 40분 → 분<40이면 직전 시각 롤백(자정 경계 처리). PTY 초단기 코드(5·6·7)는 기존 `PTY_CODE_MAP`으로 커버.
    - 초단기실황은 별도 `withStaleFallback`(독립 계측·stale) + `'use cache'`. api_logs 는 접두사 "weather"로 집계(단기예보와 동일 소스로 묶음, 신규 CHECK 불필요).
  - **테스트 체크리스트 (Playwright MCP)**:
    - [x] 라이브 산에서 초단기실황 보정 현재값 렌더(북한산 30℃/체감 31℃), 단기예보(29) 대비 실황(29.6) 반영 확인. 콘솔 에러 0.
    - [~] 초단기 강제 실패 폴백은 구조적 격리(독립 withStaleFallback→obs null→예보 유지) + 단위 검증(부분/전체 결측)으로 갈음(단일 소스 실패 주입이 까다로움).
    - [x] base_time 경계·정규화·병합·폴백 순수 로직 단위 **22/22**, `typecheck`·`lint`·`build` 통과.
  - **의존성**: Task 016(단기예보 연동)

---

### Phase 9: 핵심 판단 데이터 강화 (신규 소스)

> 제품의 핵심 가치("지금 이 산에 갈 수 있나")를 **직접 끌어올리는** 신규 외부 소스. 기존 `lib/api/*` 프록시·캐싱·`PartialResult` 격리 패턴과 컨디션 점수 모델에 편입한다.

- **✅ Task 043: 산불위험지수 연동** - 완료
  - **개요**: 봄·가을 산행의 실질적 차단 요인인 산불 위험을 노출하고 **컨디션 점수 감점 요인으로 편입**한다. 산림청 산불위험예보는 지역·날짜별 수치 지수라 기존 API 프록시 패턴에 잘 맞는다. (실시간 입산통제는 Task 044 로 분리 — 이 API 는 위험 "지수"이지 통제 목록이 아니며, 계절 입산통제는 이미 `seasonal-closure.ts` 로 반영됨.)
  - **관련 파일**: ✅ `lib/api/forest-fire.ts`·`forest-fire-core.ts`(프록시·정규화), `lib/api/cache.ts`(fire-3h 프로필·`fireKey`), `next.config.ts`(cacheLife), `lib/api/metrics.ts`(source `fire`), `lib/condition/{score,service}.ts`(감점·`calc_version` v2), `lib/types/condition.ts`(FireRisk·ScoreFactor), `components/fire-risk-badge.tsx`, `components/score-breakdown.tsx`(fire 아이콘), `app/(main)/mountains/[id]/page.tsx`, 호출부 4곳(region 전달), `supabase/migrations/20260810100000_api_logs_fire_source.sql`(적용됨), `lib/env.ts`·`.env.local.example`(`FOREST_FIRE_SERVICE_KEY`), `docs/decisions/{001,003}`
  - **수락 기준**:
    - [x] 산불위험 등급이 상세 화면에 아이콘(Flame)+텍스트로 노출된다(색상 단독 금지). 라이브: 설악산 "낮음 지수 19 강원특별자치도 기준", 계룡산 "낮음 지수 29 대전광역시 기준".
    - [~] 산불조심기간 입산통제 반영 — 이 API 는 통제 목록이 아니라 지수이므로, 정적 계절 입산통제(`seasonal-closure.ts`)로 이미 반영. 실시간 통제는 Task 044 로 분리(결정 001 기록).
    - [x] 산불위험이 컨디션 점수 감점에 반영되고 근거가 `ScoreBreakdown`에 표시되며 `calc_version` v1→**v2** 증가. (현재 전국 낮음 → 감점 0·"양호"; 감점 로직은 단위 검증.)
    - [x] 소스 실패 시 해당 변수만 제외하고 점수를 계산한다(부분 폴백), 앱 크래시 0. 라이브: 잘못된 키 주입 시 배지 숨김 + 근거에 산불위험 "제외" 행 + 날씨·탐방로 정상.
    - [x] 응답은 서버 프록시(`'use cache'`)로만 호출되고 API 키가 노출되지 않는다(`decodeURIComponent` 1회 인코딩).
  - **구현 노트**:
    - **시도 1회 호출로 전국 16개 시도 반환**(`forestPointListSidoSearchV2`, 지역코드 파라미터 불필요) → 산별 호출 없이 발표 슬롯 단위 1회 캐싱(`fire:sido:{yyyymmdd}:{slot}`, fire-3h). `meanavg`(시도 평균지수)를 대표값으로 채택.
    - 산 `region` → 시도 코드 매핑(`SIDO_REGION_CODE`). 특이점: 강원=51·전북=52 신 코드, **광주+전남=12 통합코드**. 여러 시도에 걸친 산은 **최댓값**(안전 우선).
    - 감점: 낮음 0 / 다소높음 −10 / 높음 −20 / 매우높음 −30 (결정 003 v2 동결).
  - **테스트 체크리스트 (Playwright MCP)**:
    - [x] 라이브 산에서 산불위험 등급·근거 렌더(설악산·계룡산), region 다중토큰 최댓값 채택 확인.
    - [x] 소스 강제 실패(잘못된 키 격리 인스턴스) 시 배지 숨김 + "제외" 근거·타 섹션 정상, 콘솔 에러 0.
    - [x] `api_logs`에 source `fire` success/failure 적재 확인(CHECK 제약 통과, 테스트 telemetry 정리). 순수 코어 단위 **25/25**. `typecheck`·`lint`·`build` 통과.
  - **의존성**: Task 015(API 프록시), Task 023(점수 엔진)

- **Task 044: 실시간 탐방로 통제·공지 (정적 스냅샷 보완)**
  - **개요**: 현재 정적 2023 CSV 스냅샷의 정확도 한계를 국립공원공단 실시간 통제/공지로 보완해 1단계 Must 기능(탐방로 개방 여부)의 신뢰도를 직접 개선한다. 실시간 소스를 **우선 적용하고 정적 데이터를 폴백**으로 유지한다.
  - **관련 파일**: 신규 `lib/api/knps-realtime.ts`·`*-core.ts`, `app/api/trails/route.ts`(실시간 우선 + 정적 dedupe/merge), `lib/trails/seasonal-closure.ts`(정적 계절 판정 병합), `docs/decisions/001-data-sources.md`, `docs/ROADMAP.md` 리스크 표 갱신
  - **수락 기준**:
    - [ ] 실시간 통제/공지가 있으면 상세 탐방로 상태에 우선 반영된다("실시간" 표기).
    - [ ] 실시간 소스 실패/미커버리지 시 기존 정적 스냅샷 + 계절 판정으로 폴백한다.
    - [ ] 실시간·정적 중복 코스가 이중 표기되지 않는다(dedupe).
    - [ ] 국립공원 외 산은 기존대로 "정보 없음" 폴백.
  - **구현 단계**:
    - [ ] 국립공원공단 실시간 통제/공지 API 커버리지·필드·키 검증(결정 문서화).
    - [ ] 실시간 응답 정규화 + 코스 식별키로 정적 데이터와 병합(우선순위: 실시간>정적).
    - [ ] `/api/trails`에 실시간 조회 + 캐싱(짧은 TTL) + api_logs 계측 편입.
    - [ ] 통제 사유·기간·출처(실시간/정적) 표기 UI 보강.
  - **테스트 체크리스트 (Playwright MCP)**:
    - [ ] 실시간 통제 있는 산에서 "실시간" 우선 반영, 중복 없음 확인.
    - [ ] 실시간 소스 실패 시 정적 폴백 정상, 국립공원 외 산 "정보 없음" 유지.
    - [ ] 콘솔 에러 0, `typecheck`·`lint`·`build` 통과.
  - **의존성**: Task 017(탐방로), Task 015(API 프록시)

- **✅ Task 052: 미세먼지 예보통보 연동 (내일/주간 대기질 전망)** - 완료
  - **개요**: 현재 대기질은 실시간 측정값(오늘·지금)만 제공한다. "내일/주말 산행 계획"을 위해 에어코리아 **대기질 예보통보**(`ArpltnInforInqireSvc/getMinuDustFrcstDspth`)로 오늘·내일 PM10/PM2.5 예보 등급 + 발생원인(국내/국외/황사)을 노출한다. **기존 `AIRKOREA_SERVICE_KEY`로 접근 가능한 같은 서비스의 다른 오퍼레이션이라 신규 키 발급 불필요**(신규 데이터 피드).
  - **관련 파일**: ✅ `lib/api/airkorea-forecast.ts`·`airkorea-forecast-core.ts`(예보통보 프록시·정규화·권역매핑·발표슬롯), `lib/api/cache.ts`(dust 프로필·`dustKey`), `next.config.ts`(dust-6h cacheLife), `lib/api/metrics.ts`(source `dust`), `lib/types/air.ts`(DustForecast·한글등급 매핑), `components/dust-forecast.tsx`, `app/(main)/mountains/[id]/page.tsx`(섹션·스켈레톤), `supabase/migrations/20260810110000_api_logs_dust_source.sql`(적용됨), `scratchpad/test-dust.ts`(단위 검증)
  - **수락 기준**:
    - [x] 상세 화면에 오늘·내일 PM10/PM2.5 예보 등급이 아이콘+텍스트로 노출된다(색상 단독 금지). 라이브: 북한산·설악산 오늘/내일 PM10·PM2.5 "좋음" pill + 등급 텍스트 병기.
    - [x] 발생원인(국내/국외/황사 등) 요약이 함께 표시된다(라이브: "청정한 동풍 기류 유입으로…", 불릿 `○` 정리).
    - [x] 산이 속한 예보권역으로 매핑되며, 미매핑 시 폴백한다. 라이브: 북한산 "서울·경기남부·경기북부", 설악산 "영동·영서"(강원 분할 권역 최악값). 미매핑 region → `not_covered` failure → 섹션 미노출.
    - [x] 소스 실패 시 해당 섹션만 격리(실시간 측정·타 섹션 정상), 앱 크래시 0(독립 `<Suspense>`+`hasData` 가드, 라이브 콘솔 에러 0). 강제 실패는 `withStaleFallback`+`normalizeDustForecast` 실패 경로 단위 검증으로 갈음.
    - [x] 서버 프록시(`'use cache'`)로만 호출되고 API 키가 노출되지 않는다(`decodeURIComponent` 1회 인코딩).
  - **구현 노트**:
    - **1회 호출로 전 권역이 모두 옴** → 산별 호출 없이 발표 슬롯 단위 1회 캐싱(`dust:{yyyymmdd}:{slot}`, dust-6h). `InformCode` 파라미터를 줘도 PM10/PM25/O3 가 섞여 오고 같은 대상일에 여러 발표(05·11·17·23시)가 오므로, 코어에서 **코드 재필터 + 최신 발표만** 채택한다.
    - 예보권역 토큰: 시도명과 대체로 같으나 **강원=영동/영서, 경기=경기남부/경기북부로 분할**. 산 `region` → 권역 매핑(`REGION_TO_FORECAST`), 여러 권역/다중토큰 산은 **최악 등급**(안전 우선).
    - 한글 등급(좋음/보통/나쁨/매우나쁨) → `AirGrade` 매핑(`AIR_GRADE_KOR_MAP`), 심각도 순서(`AIR_GRADE_SEVERITY`)로 최악값 선택. 점수 감점 없음(예보는 표시 전용, `calc_version` 불변).
  - **테스트 체크리스트 (Playwright MCP)**:
    - [x] 라이브 산에서 오늘·내일 예보 등급·발생원인 렌더, 권역 매핑 정확성 확인(북한산 서울·경기, 설악산 영동·영서).
    - [x] 소스 실패 격리는 독립 Suspense+hasData 구조 + normalize 실패 단위 검증으로 갈음, 타 섹션 정상·콘솔 에러 0.
    - [x] `api_logs` source `dust` 적재 확인(CHECK 제약 통과, 테스트 telemetry 정리). 순수 로직 단위 **29/29**. 360px 오버플로 0. `typecheck`·`lint`·`build` 통과.
  - **의존성**: Task 021(대기질 실시간), Task 015(API 프록시)

---

### Phase 10: 콘텐츠 확장 (정적 시드)

> 신규 소스가 필요하지만 대부분 정적 데이터라 **검증된 국립공원공단 CSV 시드 파이프라인**(`parse-knps-csv.ts`·`gen-trails.ts` 패턴)을 재사용한다.

- **Task 045: 편의시설 (화장실·대피소·식수대·매점)**
  - **개요**: 국립공원 편의시설 공공데이터를 `trails`처럼 정적 시드로 적재하고 상세/지도에 노출한다.
  - **관련 파일**: 신규 `supabase/migrations/*_facilities.sql`, 신규 `supabase/seed/{gen-facilities.ts,facilities.sql}`, 신규 `lib/data/facilities.ts`, 신규 `components/facility-list.tsx`, `app/(main)/mountains/[id]/page.tsx`, (지도 POI 시) `components/*map*`, `lib/supabase/database.types.ts` 재생성
  - **수락 기준**:
    - [ ] 상세 화면에 산별 편의시설 목록(유형 아이콘+명칭)이 노출된다.
    - [ ] 데이터 없는 산은 섹션 미노출 또는 "정보 없음" 폴백.
    - [ ] (선택) 지도에 편의시설 마커가 표시되고 범례에 유형이 병기된다.
    - [ ] RLS 공개 select·쓰기 차단(mountains/trails와 동일).
  - **구현 단계**:
    - [ ] 편의시설 공공데이터 확보·라이선스 확인, 산 매핑 규칙 정의(결정 문서화).
    - [ ] 마이그레이션 + 시드 생성기(CSV 파싱 재사용) + 멱등 적재.
    - [ ] 데이터 계층 + 표현 컴포넌트, (선택) 지도 마커.
    - [ ] 타입 재생성.
  - **테스트 체크리스트 (Playwright MCP)**:
    - [ ] 시설 보유 산에서 목록/마커 렌더, 미보유 산 폴백 확인.
    - [ ] `get_advisors` 보안·RLS 경고 0, 콘솔 에러 0, `typecheck`·`lint`·`build` 통과.
  - **의존성**: Task 014, Task 017(시드 파이프라인), (지도 시) Task 029
  - **테스트 노트**: 스키마·RLS·시드가 있으므로 API/비즈니스 로직 작업으로 간주 → 위 Playwright 시나리오 필수.

- **Task 046: 계절 명소·야생동물 주의**
  - **개요**: 단풍·설경 등 시즌 정보와 곰·멧돼지 등 야생동물 출몰 주의를 큐레이션 정적 콘텐츠 + 시즌 기간 판정으로 노출한다(기존 `seasonal-closure.ts` 기간 판정 로직과 유사).
  - **관련 파일**: 신규 `supabase/migrations/*_seasonal_content.sql` 또는 시드 데이터, 신규 `lib/data/seasonal.ts`, 신규 `lib/seasonal/period.ts`(기간 판정 순수 로직), 신규 `components/seasonal-notice.tsx`, `app/(main)/mountains/[id]/page.tsx`
  - **수락 기준**:
    - [ ] 조회일이 해당 시즌(예: 단풍 기간)에 들면 시즌 안내가 노출된다.
    - [ ] 야생동물 주의 정보가 있으면 경고 배너(아이콘+텍스트)로 노출된다.
    - [ ] 시즌 밖/데이터 없음이면 섹션 미노출.
  - **구현 단계**:
    - [ ] 시즌·주의 콘텐츠 큐레이션 데이터 정의(산×시즌×기간).
    - [ ] 기간 판정 순수 함수(KST 자정 경계·연말 wrap 처리) + 단위 검증.
    - [ ] 표현 컴포넌트 삽입, 색상 단독 금지·접근성 준수.
  - **테스트 체크리스트 (Playwright MCP)**:
    - [ ] 시즌 내/외 날짜에서 안내 노출·미노출 경계 확인, 야생동물 경고 렌더.
    - [ ] 콘솔 에러 0, `typecheck`·`lint`·`build` 통과.
  - **의존성**: Task 017(기간 판정 로직 참조), Task 014

---

### Phase 11: 고비용·후순위

> 유용성은 있으나 **백엔드 스케줄러·운영(모더레이션)·파편화된 소스** 등 비용이 큰 항목. Phase 8～10 완료 후 필요성을 재검토해 착수한다.

- **Task 047: 푸시 알림 (즐겨찾기 산 조건 변화)**
  - **개요**: 즐겨찾기 산의 컨디션/통제가 나빠지면 Web Push로 알린다. PWA는 있으나 구독 관리 + **백엔드 스케줄러(cron)**가 신규로 필요.
  - **관련 파일**: `public/sw.js`(push 핸들러), 신규 `app/api/push/*`(구독 저장·발송), 신규 `supabase/migrations/*_push_subscriptions.sql`, 스케줄러(예: Vercel Cron/Supabase Edge Function), `components/*`(알림 옵트인 UI)
  - **수락 기준**:
    - [ ] 사용자가 알림을 옵트인/해제할 수 있고 구독이 본인 RLS로 저장된다.
    - [ ] 즐겨찾기 산 조건 악화 시 푸시가 발송된다(중복/스팸 억제).
    - [ ] 미지원 브라우저에서 옵트인 UI가 비활성 처리된다.
  - **구현 단계**:
    - [ ] Web Push 키(VAPID)·구독 저장 스키마·RLS.
    - [ ] 서비스워커 push/notificationclick 핸들러.
    - [ ] 조건 평가 스케줄러 + 발송 로직 + 발송 로그.
    - [ ] 옵트인 UI(마이페이지) + 계측.
  - **테스트 체크리스트 (Playwright MCP)**:
    - [ ] 옵트인 → 구독 저장 확인, 조건 트리거 시 발송 경로 확인(가능 범위 내), 미지원 폴백.
    - [ ] `typecheck`·`lint`·`build` 통과.
  - **의존성**: Task 030(PWA), Task 026(즐겨찾기)

- **Task 048: 사용자 후기·별점**
  - **개요**: 방문자 리뷰·코스별 별점. 유용성은 높으나 **모더레이션·스팸 대응 운영 비용**이 크다. PRD 8장 명시적 제외 항목 → 수요 확인 시 편입. `visited`/`profiles` 위에 얹는다.
  - **관련 파일**: 신규 `supabase/migrations/*_reviews.sql`, 신규 `app/api/reviews/*`, 신규 `components/{review-form,review-list}.tsx`, `app/(main)/mountains/[id]/page.tsx`
  - **수락 기준**:
    - [ ] 로그인 사용자가 별점/후기를 작성·수정·삭제할 수 있다(본인 RLS).
    - [ ] 상세에 평균 별점·최근 후기가 노출되고, 신고/숨김 등 기본 모더레이션 수단이 있다.
    - [ ] 방문완료(`visited`) 사용자만 작성 등 남용 억제 정책을 적용한다.
  - **구현 단계**:
    - [ ] 리뷰 스키마·RLS·집계(평균 별점) 설계.
    - [ ] 작성/목록 API + 낙관적 업데이트 UI(기존 favorite/visited 패턴 재사용).
    - [ ] 모더레이션(신고·숨김)·스팸 억제 정책.
  - **테스트 체크리스트 (Playwright MCP)**:
    - [ ] 작성→표시→수정→삭제 라운드트립, 본인 외 접근 차단(RLS), 평균 별점 정확.
    - [ ] 콘솔 에러 0, `typecheck`·`lint`·`build` 통과.
  - **의존성**: Task 026(인증/즐겨찾기), Task 037(방문완료)

- **Task 049: 주차·교통·입장료** (필요성 재검토 대상)
  - **개요**: 주차장 위치·혼잡도, 대중교통 접근, 입장/주차 요금. 지자체·주차·교통 소스가 **파편화**되고 들머리 매칭 난이도가 높아 후순위.
  - **관련 파일**: 신규 `lib/api/*` 또는 시드, `lib/data/*`, `components/*`, `app/(main)/mountains/[id]/page.tsx`
  - **수락 기준**:
    - [ ] 주차/교통/요금 정보가 있으면 상세에 노출, 없으면 폴백.
    - [ ] 소스 실패 격리(다른 섹션 영향 0).
  - **구현 단계**:
    - [ ] 소스 실현성·커버리지·매칭 규칙 검증(결정 문서화) → 적재/프록시 방식 결정.
    - [ ] 정규화·표현·폴백 구현.
  - **테스트 체크리스트 (Playwright MCP)**:
    - [ ] 데이터 유무 케이스별 렌더/폴백, 콘솔 에러 0, `typecheck`·`lint`·`build` 통과.
  - **의존성**: Task 014

- **Task 050: 전망 사진·포토스팟** (필요성 재검토 대상)
  - **개요**: 정상·주요 지점 전망 사진과 추천 포토스팟. 이미지 저장소 + 지속 큐레이션 운영이 필요하고 판단-결정 가치가 상대적으로 낮아 최후순위.
  - **관련 파일**: Supabase Storage 또는 외부 이미지 소스, 신규 `lib/data/*`, `components/*`, `app/(main)/mountains/[id]/page.tsx`
  - **수락 기준**:
    - [ ] 사진/포토스팟이 있으면 갤러리로 노출되고 지연 로딩된다(LCP 저해 방지).
    - [ ] 저작권/출처 표기, 없으면 섹션 미노출.
  - **구현 단계**:
    - [ ] 이미지 소스·저작권 정책·저장 방식 결정.
    - [ ] 갤러리·지연 로딩·접근성(대체텍스트) 구현.
  - **테스트 체크리스트 (Playwright MCP)**:
    - [ ] 갤러리 렌더·지연 로딩·대체텍스트 확인, LCP 회귀 없음, 콘솔 에러 0, `typecheck`·`lint`·`build` 통과.
  - **의존성**: Task 026(큐레이션 권한 시)

