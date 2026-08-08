# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Next.js 16 (App Router) + Supabase Auth 스타터 킷입니다. `@supabase/ssr`로 쿠키 기반 세션을 Client Component, Server Component, Route Handler, `proxy.ts` 전반에서 공유합니다.

## 명령어

```bash
npm run dev          # 개발 서버 (HTTP 헤더 크기 제한을 32768로 늘려서 실행)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 실행
npm run lint         # ESLint 검사 (eslint-config-next의 core-web-vitals + typescript)
npm run lint:fix     # ESLint 자동 수정
npm run typecheck    # 타입 체크 (tsc --noEmit)
npm run format       # Prettier 전체 포맷
npm run format:check # Prettier 포맷 위반 검사 (CI용)
```

- 테스트 러너/스크립트는 아직 구성되어 있지 않습니다. (E2E는 Playwright MCP로 수행하는 것이 이 저장소의 방향이며 `docs/ROADMAP.md`에 명시)
- 환경변수는 `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 두 개만 필요합니다. 값이 없으면 `lib/utils.ts`의 `hasEnvVars`가 `false`가 되어 UI가 튜토리얼/경고 모드로 폴백합니다(`components/env-var-warning.tsx`, `lib/supabase/proxy.ts`).

## 코드 품질 자동화 (커밋 전 자동 검사)

- 커밋 시 husky `pre-commit` 훅이 `lint-staged`를 실행합니다(`.husky/pre-commit`, `lint-staged.config.mjs`). git 저장소이므로 훅이 활성화되어 있습니다.
- 스테이징된 `*.{ts,tsx}`는 **`tsc --noEmit`(프로젝트 전체 대상, 파일 인자 없이 1회) → `eslint --fix` → `prettier --write`** 순으로 검사되며, **타입 오류가 있으면 커밋이 차단**됩니다. 그 외 `json/css/md/yaml` 등은 `prettier --write`만 적용됩니다.
- Prettier는 `prettier-plugin-tailwindcss`로 Tailwind 클래스를 정렬하고 `cn`/`clsx`/`cva` 함수 내부 클래스까지 인식합니다(`.prettierrc.json`). 자동 생성 파일 `lib/supabase/database.types.ts`는 포맷·린트 대상에서 제외됩니다(`.prettierignore`, `eslint.config.mjs`의 `ignores`).
- ESLint flat config(`eslint.config.mjs`)는 `eslint-config-prettier`를 **마지막에** 배치해 Prettier와 충돌하는 포매팅 규칙을 끕니다.
- `.vscode/settings.json`에 저장 시 자동 포맷(Prettier) + ESLint 자동 수정이 설정되어 있습니다(`.vscode/extensions.json`에 권장 확장 명시).

## 아키텍처

### 디렉토리 구조 — `src/` 없음

`app/`, `components/`, `lib/`는 모두 프로젝트 **루트**에 위치합니다 (`src/` 디렉토리 사용 안 함). 경로 별칭 `@/*`는 `tsconfig.json`에서 `./*`(루트)로 매핑됩니다.

`docs/` 하위 문서:

- `docs/guides/` — 아키텍처/스타일/폼 처리/Next.js 16 등 상세 가이드 5종. 관련 작업 전 참고.
- `docs/PRD.md` (제품 요구사항), `docs/ROADMAP.md` (Phase/Task 개발 로드맵), `docs/decisions/` (기술 결정 기록, 예: 외부 데이터 소스·API 선정) — 진행 중인 프로덕트("산길날씨") 기획 문서. 기능 작업 시 해당 Task/결정을 확인하세요.

### Supabase 클라이언트 3종 — 컨텍스트별로 반드시 구분해서 사용

- `lib/supabase/client.ts` — `createBrowserClient`, Client Component(`"use client"`)에서만 사용.
- `lib/supabase/server.ts` — `createServerClient` + `next/headers`의 `cookies()`, Server Component/Route Handler에서 `await createClient()`로 사용. **전역 변수에 저장하지 말고 매 요청마다 새로 생성**할 것 (Fluid compute 대응, 코드 주석에 명시됨).
- `lib/supabase/proxy.ts` — `updateSession()`, `proxy.ts`(구 middleware) 전용. 요청 쿠키를 읽고 세션을 갱신한 뒤 응답 쿠키에 다시 써야 하므로, 이 함수의 쿠키 처리 로직은 함부로 바꾸지 말 것(주석에 이유가 상세히 적혀 있음).
- 세션 확인은 `supabase.auth.getUser()`가 아니라 **`supabase.auth.getClaims()`**를 사용하는 것이 이 코드베이스의 관례입니다(더 빠름). `data?.claims`가 사용자 정보를 담고 있습니다.

### 인증 라우팅 흐름

1. 루트의 `proxy.ts`가 모든 요청(정적 파일 제외)에서 `updateSession()`을 호출합니다.
2. `updateSession()`(`lib/supabase/proxy.ts`)은 `/`, `/login*`, `/auth/*`를 제외한 경로에서 세션이 없으면 `/auth/login`으로 리다이렉트합니다.
3. `app/auth/*`에 로그인/회원가입/비밀번호 재설정/이메일 확인(`confirm/route.ts`) 페이지가 있고, `app/protected/*`가 인증이 필요한 영역입니다. 개별 서버 컴포넌트(`app/protected/page.tsx` 등)도 `getClaims()`로 재확인 후 `redirect("/auth/login")` 하는 이중 방어 패턴을 씁니다.
4. 로그인/회원가입 폼(`components/*-form.tsx`)은 Server Action이 아니라 **Client Component에서 `supabase.auth.*`를 직접 호출**하는 패턴입니다(`login-form.tsx`, `profile-form.tsx` 참고).

### DB 타입

`lib/supabase/database.types.ts`는 Supabase에서 생성된 타입입니다(`mcp__supabase__generate_typescript_types`로 재생성). 컴포넌트에서는 `Tables<"테이블명">` 헬퍼로 필요한 컬럼만 `Pick`해서 씁니다(`components/profile-form.tsx` 참고). 스키마를 변경했다면 이 파일을 재생성해야 합니다.

### Next.js 16 관련 특이사항

- `middleware.ts`가 아니라 **`proxy.ts`**를 사용합니다(Next 16에서 이름이 바뀜, `export function proxy`).
- `next.config.ts`에 `cacheComponents: true`가 설정되어 있어 Cache Components(`"use cache"` 지시어 기반 캐싱) 모델이 활성화되어 있습니다. 데이터 페칭 코드를 작성할 때 이 캐싱 모델을 염두에 두세요.
- `cookies()`, `headers()`, `params`, `searchParams` 등 request-time API는 전부 비동기이며 동기 접근은 지원되지 않습니다.

### 스타일링

- Tailwind CSS v4 + shadcn/ui(`new-york` 스타일, `components.json` 참고)이지만, 색상 테마는 v4의 `@theme`/oklch 방식이 아니라 **`tailwind.config.ts` + `@config` 지시어(`app/globals.css`)로 v3 방식 HSL CSS 변수**(`--background`, `--primary` 등)를 계속 사용하는 하이브리드 구성입니다. 새 색상 토큰을 추가할 때는 `app/globals.css`의 `:root`/`.dark`와 `tailwind.config.ts`의 `theme.extend.colors`를 함께 수정해야 합니다.
- 다크모드는 `next-themes`의 `ThemeProvider`를 `app/layout.tsx`에서 직접 사용합니다(별도 provider 래퍼 컴포넌트 없음).
- 클래스 조합은 `lib/utils.ts`의 `cn()`(clsx + tailwind-merge)을 사용합니다.

### 컴포넌트 조직

`src/` 없이 `components/` 루트에 페이지별 컴포넌트를 평평하게 배치하고, `components/ui/`는 shadcn/ui가 생성한 프리미티브(추가는 `npx shadcn@latest add`), `components/tutorial/`은 스타터킷 온보딩 전용 컴포넌트입니다. 파일명은 전부 kebab-case, 컴포넌트명은 PascalCase입니다.

## Claude Code 커스텀 설정

- `.claude/agents/`에 이 저장소 전용 서브에이전트가 정의되어 있습니다: `dev/nextjs-supabase-expert`(Next.js+Supabase 기능 구현), `dev/ui-markup-specialist`(정적 마크업/스타일링), `dev/nextjs-app-developer`(라우팅/레이아웃 구조), `dev/code-reviewer`, `dev/development-planner`(ROADMAP.md), `docs/prd-generator`, `docs/prd-validator` 등.
- `.claude/commands/git/`에 `commit`, `pr`, `merge`, `branch`, `update-roadmap` 슬래시 커맨드가 정의되어 있습니다.
