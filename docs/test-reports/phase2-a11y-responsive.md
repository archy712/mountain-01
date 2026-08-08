# Phase 2 반응형·접근성 감사 (Task 013)

- **일자**: 2026-08-08
- **도구**: Playwright MCP (`browser_resize` / `browser_evaluate` / `browser_press_key` / 스냅샷)
- **대상 화면**: 홈(`/`), 산 상세(`/mountains/[id]`), 전체화면 지도(`/mountains/[id]/map`), 오프라인(`/offline`), 로그인(`/auth/login`, 참고)
- **제외**: 즐겨찾기(`/favorites`) 화면 내부 — proxy 보호로 비로그인 시 `/auth/login` 리다이렉트되어 인증 활성화(Task 025) 이후 검증

## 검사 항목 및 결과

| 항목 | 결과 |
| --- | --- |
| 뷰포트 레이아웃(360/390/768/1024px) 가로 오버플로 | ✅ 전 뷰포트 오버플로 0px, `main` 640px(`max-w-screen-sm`) 캡 유지 |
| 터치 타깃 최소 44×44px | ⚠️→✅ 5건 위반 발견·수정 |
| 접근성 이름(aria/label/text) | ⚠️→✅ 1건 위반(테마 스위처) 수정 |
| 색상 단독 정보 전달 금지 | ✅ 탐방로 상태·컨디션 등급·지도 범례 모두 아이콘/텍스트 병기 |
| 제목 위계(h1→h2→h3) | ✅ 상세 페이지 스킵 없음 |
| 키보드 내비게이션·포커스 링 | ⚠️→✅ 포커스 링 전역 미표시(WCAG 2.4.7) 발견·수정 |
| 다크모드 대비 | ✅ 상태/등급색 명도 상향(Task 008)으로 어두운 배경 대비 확보 |
| 앱 콘솔 에러 | ✅ 0건 (HMR WebSocket 재연결 노이즈만, 앱 오류 아님) |

## 발견 및 수정

### 1. 키보드 포커스 링 전역 미표시 (WCAG 2.4.7) — 심각

- **원인**: 이 Tailwind v4 + v3 `@config` 하이브리드에서 shadcn 프리미티브의 `focus-visible:ring-1 focus-visible:ring-ring` 유틸이 **컴파일된 CSS에 생성되지 않아** box-shadow 링이 렌더되지 않음. 동시에 `focus-visible:outline-none`으로 브라우저 기본 아웃라인도 제거되어 키보드 포커스가 전혀 보이지 않음. (`document.styleSheets` 조회로 해당 규칙 부재 확인, 실제 포커스 요소 `box-shadow: none`·`outline-style: none` 측정)
- **수정**: `app/globals.css`에 **레이어 밖(unlayered)** `:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }` 추가. unlayered 규칙은 utilities 레이어의 `outline-none`을 항상 이기므로 `!important` 없이 전역 포커스 가시성 보장. 라이트/다크 모두 `--ring` 토큰 사용.
- **검증**: 로고 링크·테마 버튼 Tab 포커스 시 `outline: solid 2px`·offset 2px 렌더 확인.

### 2. 테마 스위처 접근성 이름 부재 + 터치 타깃 미달

- **원인**: `components/theme-switcher.tsx`의 트리거 Button이 아이콘만 담아 접근성 이름 없음(40×32).
- **수정**: `aria-label="테마 변경"` 추가 + `size="icon" className="size-11"`(44×44).

### 3. 터치 타깃 44×44px 미달 (4건)

| 요소 | 이전 | 수정 |
| --- | --- | --- |
| 헤더 로고 링크 (`site-header.tsx`) | 54×24 | `inline-flex h-11 items-center` |
| 상세 "전체화면" 링크 (`mountains/[id]/page.tsx`) | 84×36 | `h-9`→`h-11` |
| PWA 배너 "설치" 버튼 (`pwa-install-prompt.tsx`) | 45×36 | `h-9`→`h-11` |
| PWA 배너 닫기 버튼 (`pwa-install-prompt.tsx`) | 36×36 | `size-9`→`size-11` |
| 지도 뒤로가기 버튼 (`mountains/[id]/map/page.tsx`) | 36×36 | `size-9`→`size-11` |

### 4. PWA 배너 하단 콘텐츠 가림 (경미)

- 하단 고정 배너(~76px)가 `main`의 `pb-16`(64px)보다 커서 최하단 콘텐츠를 살짝 가림 → `(main)/layout.tsx` `pb-16`→`pb-24`.

## 잔여 항목 (범위 밖 / 후속 Task)

- **로그인·회원가입 폼** (`app/auth/*`): 입력 라벨은 존재(a11y OK)하나 영문 스타터 상태이며 입력/버튼 높이 36px. **Task 025(인증 활성화·정비)** 에서 한글화·터치 타깃과 함께 정비 예정 — 본 Task(Phase 2 UI)에서 손대지 않음.
- **즐겨찾기 화면 내부 검증**: proxy 보호로 인증 필요 → **Task 025** 이후 스냅샷 검증.

## 최종 상태

- `npm run typecheck` · `npm run lint` · `npm run build` 통과.
- 재감사 결과 홈·상세·지도 화면 터치 타깃/접근성 이름 위반 0건, 포커스 링 정상 렌더.
