# Task 033 — 접근성·에러/로딩 폴백 전면 감사 리포트

- 일시: 2026-08-09
- 기준: PRD 7장(접근성 / 에러·로딩 상태 처리 / 외부 API 실패 폴백 전략)
- 방법: 정적 코드 감사 + Playwright 라이브 검증(프로덕션 빌드, 360×800)
- 대상: 홈 `/`, 산 상세 `/mountains/[id]`, 즐겨찾기 `/favorites`, 인증 `app/auth/*`

> Task 013(Phase 2 a11y)이 이연했던 `app/auth/*` 폼·`/favorites` 내부와, Phase 3~5에서 추가된 실데이터 화면(에러/폴백 경로 포함)을 전수 재감사했다.

---

## 1. 요약

- **터치 타깃(44px)**: 라이브 스윕 결과 홈·상세·로그인 전 화면 **위반 0건**으로 수정 완료(수정 전 auth 폼·헤더 인증·에러 재시도 등 다수 36/32px).
- **폼 라벨/aria**: 라벨 완비 확인, **폼 에러 6곳을 `role="alert"` + 테마 색으로 교정**(기존 미고지 + 하드코딩 `text-red-500`).
- **에러 재시도 버튼**: 소스별 부분 실패(날씨/탐방로) 폴백에 **재시도 버튼 추가**(PRD "에러 = 메시지 + 재시도" 완전 충족).
- **스크린리더 흐름**: 단일 h1·랜드마크 완비 확인, **날씨 섹션 제목 누락으로 인한 제목 위계 오중첩 교정**.
- **색상 단독 구분 금지 / 게이지 텍스트 병기 / 로딩 스켈레톤 / 폴백 매트릭스**: 라이브·코드로 전부 충족 확인.

---

## 2. 접근성 (PRD 7.2)

### 2-1. 터치 타깃 44×44px — 수정 8건
클래스가 아닌 **실제 렌더 크기**를 라이브 측정해 확정.

| 대상 | 수정 전 | 수정 | 파일 |
| --- | --- | --- | --- |
| 폼 입력(이메일·비밀번호 등, 5개 폼) | h-9 36px | Input 프리미티브 `h-11` | `components/ui/input.tsx` |
| 폼 제출 버튼 + Google 버튼 | h-9 36px | `h-11` | `*-form.tsx`·`google-auth-button.tsx` |
| 헤더 인증(즐겨찾기·로그인·로그아웃) | sm 32px | `h-11`(아이콘 전용 즐겨찾기는 `min-w-11`) | `auth-button.tsx`·`logout-button.tsx` |
| 에러 재시도 버튼 | sm 32px | `h-11` | `error-fallback.tsx` |
| 즐겨찾기 로그인 유도 CTA | h-9 36px | `h-11` | `favorite-button.tsx` |
| 최근 검색 "전체 삭제" | 텍스트 ~16px | `min-h-11` | `recent-searches.tsx` |
| 로그인 "비밀번호를 잊으셨나요?"(문장 밖 독립 링크) | 20px | `min-h-11` | `login-form.tsx` |

- **문장 내 인라인 링크**(예: "계정이 없으신가요? **회원가입**")는 18px지만 WCAG 2.5.8 **인라인 예외**(문장 흐름·line-height 종속)에 해당 → 의도적으로 유지.
- 라이브 재스윕: 홈 0건 / 상세 0건 / 로그인 0건 / 검색 드롭다운 옵션 0건.

### 2-2. 폼 라벨 / aria
- 모든 입력에 `<Label htmlFor>` 매칭 확인.
- **폼 에러 메시지 6곳** — `text-red-500`(하드코딩·다크 대비 취약) + `role` 없음(스크린리더 미고지) → **`role="alert"` + `text-destructive`** 로 교정(login·sign-up·forgot·update·profile·google-auth). profile 성공 문구는 `role="status"` + `text-status-open`.

### 2-3. 색상 단독 구분 금지 — 충족
아이콘/텍스트 병기 확인: 탐방로 상태 배지, 컨디션 등급, 즐겨찾기 점수 칩, 지도 범례, 난이도 별점(별+라벨+aria), 대기·자외선 타일. 시간대별 강수확률은 색+수치·아이콘 병기.

### 2-4. 컨디션 점수 게이지 텍스트 병기 — 충족
`role="img"` + `aria-label="컨디션 점수 100점 만점에 71점, 등급 좋음"` + 시각 등급·메시지 텍스트 병기(라이브 확인).

---

## 3. 에러/로딩 상태 (PRD 7.3)

### 3-1. 로딩 스켈레톤 — 충족
모든 데이터 페칭 구간에 스켈레톤/`<Suspense>` 존재: 홈(검색 드롭다운 스켈레톤·인기 산 Suspense), 상세(컨디션·날씨·탐방로 각 스켈레톤 + 지도 오버레이 Suspense), 즐겨찾기(Suspense). 스켈레톤은 실제 높이에 정렬(Task 032)돼 CLS도 0.

### 3-2. 에러 = 친화 메시지 + 재시도 — 수정 1건(구조)
- 라우트 경계 `error.tsx` 는 `ErrorFallback`(메시지 + `reset` 재시도) 사용.
- **소스별 부분 실패(날씨/탐방로) 폴백에 재시도 버튼이 없던 문제 교정**: 이들은 서버 컴포넌트라 클라이언트 콜백 전달이 불가 → `ErrorFallback` 에 **`refreshOnRetry`**(내부에서 `router.refresh()` 로 해당 소스 재조회) 옵션을 추가하고 `weather-summary-card`·`trail-list` 실패 폴백에 적용.

### 3-3. 부분 실패 허용 — 충족
`PartialResult`(success/stale/failure) 로 소스별 격리. 한 소스 실패가 다른 섹션·앱을 무너뜨리지 않음(독립 `<Suspense>`).

---

## 4. 폴백 매트릭스 (PRD 7.4)

| 시나리오 | PRD 명시 동작 | 검증 | 결과 |
| --- | --- | --- | --- |
| 날씨 실패 | 메시지 + 재시도, 탐방로만이라도 표시 | 코드(`weather-summary-card`→ErrorFallback+재시도, 독립 Suspense) + Task 019/020 라이브 실증 | ✅ (재시도 버튼 신규 추가) |
| 탐방로 실패/미보유 | "정보 없음", 날씨 정상 | **라이브**(관악산 "탐방로 개방 정보가 없어요" + 크래시 0) + 실패 시 ErrorFallback+재시도 | ✅ |
| 대기질/자외선 실패 | 점수에서 제외 + "일부 데이터 제외" 표기 | 코드(`score-breakdown` `excludedVariables`→배지) + Task 024 라이브 실증(설악산 미세먼지 제외) | ✅ |
| 지도 실패 | 정적 좌표 + 외부 지도 링크 | **라이브**(dapi.kakao.com 차단 → "지도를 표시할 수 없어요" + "카카오맵에서 열기" 링크) | ✅ |
| stale 캐시 | "N분 전 기준" 라벨 | 코드(`stale-data-notice`: 방금/N분 전/N시간 전) + Task 019 라이브 실증 | ✅ |

---

## 5. 스크린리더 기본 흐름

- **단일 h1**(산 이름), 랜드마크 완비(`header`/`main` + 섹션별 `aria-labelledby`).
- **수정**: 날씨 섹션에 제목이 없어 하위 "시간대별"/"3일 예보"(h3)가 앞선 h2("추천 장비") 아래로 잘못 중첩 → 날씨 섹션에 **sr-only h2 "오늘 날씨"** 추가, "추천 장비"는 컨디션 히어로 내부 중첩에 맞춰 **h3** 로 조정.
- 교정 후 제목 위계(스킵 0):
  `h1 설악산 → h2 컨디션 점수(sr) → h3 점수 근거 → h3 대기질·자외선 → h3 추천 장비 → h2 오늘 날씨(sr) → h3 시간대별 → h3 3일 예보 → h2 탐방로 → h2 지도`
- 키보드 포커스 가시성: 전역 `:focus-visible` 아웃라인 유지(Task 013).
- 게이지 `role="img"`·즐겨찾기 `aria-pressed`·탐방로 강조 버튼 `aria-pressed`·아이콘 `aria-hidden` 확인.

---

## 6. 기준선 검증
- `npm run typecheck` ✅ / `lint` ✅ / `build` ✅ (PPR 프리렌더 유지)
- 라이브 콘솔: 앱 JS 에러 0건(지도 폴백 테스트의 차단된 dapi.kakao.com 요청 로그는 의도적 유발).

## 7. 수정 파일
`components/ui/input.tsx`, `components/{login,sign-up,forgot-password,update-password,profile}-form.tsx`, `components/{google-auth-button,logout-button,auth-button,favorite-button,recent-searches,error-fallback,weather-summary-card,trail-list,gear-recommendation-list}.tsx`, `app/(main)/mountains/[id]/page.tsx`

## 8. 결론
PRD 7장 접근성·에러/로딩·폴백 요구사항을 전 화면에서 충족. 터치 타깃 위반 0건, 폼 에러 고지·부분 실패 재시도·제목 위계를 보강했고 폴백 매트릭스 5종을 라이브/코드로 검증. 신규 회귀 없음.
