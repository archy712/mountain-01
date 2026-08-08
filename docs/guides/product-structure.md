# 프로젝트 구조 가이드

이 문서는 Next.js 16.2.12 프로젝트의 폴더 구조, 파일 조직 및 네이밍 컨벤션을 정의합니다.

> 이 프로젝트는 `src/` 디렉토리를 사용하지 않습니다. `app/`, `components/`, `lib/`는 모두 프로젝트 루트에 위치하며, 경로 별칭 `@/*`도 루트를 기준으로 합니다 (`tsconfig.json`의 `paths: { "@/*": ["./*"] }`).

## 🏗️ 전체 프로젝트 구조

```
nextjs-supabase-01/
├── docs/
│   └── guides/            # 개발 가이드 모음
├── public/                # 🌍 정적 파일 (있는 경우)
├── app/                   # 🚀 Next.js App Router (루트 위치, src/ 없음)
├── components/            # 🧩 React 컴포넌트 (루트 위치)
├── lib/                   # 🛠️ 유틸리티 및 Supabase 클라이언트 (루트 위치)
├── components.json        # shadcn/ui 설정
├── next.config.ts         # Next.js 설정
├── proxy.ts                # 🔄 Next.js 16 proxy (구 middleware.ts)
├── tailwind.config.ts      # Tailwind v4 호환 설정 (@config로 globals.css에서 참조)
├── package.json            # 의존성 및 스크립트
├── tsconfig.json           # TypeScript 설정 (paths: "@/*" → "./*")
└── CLAUDE.md               # 개발 지침 메인 문서
```

## 📁 세부 폴더 구조

### app/ - App Router 페이지 (실제 구조)

```
app/
├── layout.tsx                      # 🎨 루트 레이아웃 (ThemeProvider 등 전역 설정)
├── page.tsx                        # 🏠 홈페이지 (/)
├── globals.css                     # 🎨 전역 CSS + Tailwind v4 테마 변수
├── favicon.ico
├── opengraph-image.png
├── twitter-image.png
├── auth/                           # 🔐 인증 관련 페이지
│   ├── login/page.tsx
│   ├── sign-up/page.tsx
│   ├── sign-up-success/page.tsx
│   ├── forgot-password/page.tsx
│   ├── update-password/page.tsx
│   ├── error/page.tsx
│   └── confirm/route.ts            # Supabase 이메일 confirm 라우트 핸들러
└── protected/                      # 🔒 인증이 필요한 페이지 그룹
    ├── layout.tsx
    ├── page.tsx
    └── profile/page.tsx
```

**🚀 App Router 규칙:**

- `page.tsx`: 해당 경로의 메인 페이지
- `layout.tsx`: 레이아웃 컴포넌트 (자식 페이지 감쌈)
- `route.ts`: Route Handler (API 엔드포인트)
- `loading.tsx` / `error.tsx` / `not-found.tsx`: 필요한 세그먼트에만 추가 (현재는 미사용)

### components/ - 컴포넌트 조직 (실제 구조)

```
components/
├── ui/                       # 🎛️ shadcn/ui 기본 컴포넌트
│   ├── badge.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── checkbox.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   └── label.tsx
├── tutorial/                 # 📄 튜토리얼 안내 컴포넌트
│   ├── code-block.tsx
│   ├── connect-supabase-steps.tsx
│   ├── fetch-data-steps.tsx
│   ├── sign-up-user-steps.tsx
│   └── tutorial-step.tsx
├── auth-button.tsx           # 🔐 로그인/로그아웃 상태 버튼
├── login-form.tsx
├── sign-up-form.tsx
├── forgot-password-form.tsx
├── update-password-form.tsx
├── logout-button.tsx
├── profile-form.tsx
├── theme-switcher.tsx        # 🌓 다크모드 토글 (next-themes의 useTheme 직접 사용)
├── deploy-button.tsx
├── env-var-warning.tsx
├── hero.tsx
├── next-logo.tsx
└── supabase-logo.tsx
```

**🧩 컴포넌트 분류 규칙:**

1. **ui/**: shadcn/ui 기반 재사용 가능한 기본 컴포넌트
   - 순수 UI 컴포넌트만 포함, 비즈니스 로직 없음, props로 모든 동작 제어
   - 추가는 `npx shadcn@latest add [component-name]`으로 진행

2. **tutorial/**: 스타터킷의 온보딩/튜토리얼 전용 컴포넌트
   - 실제 제품 기능이 아닌 안내용 컴포넌트는 이 폴더에 유지

3. **components/ 루트**: 여러 페이지에서 재사용되지 않는 단일 기능 컴포넌트
   - 로그인/회원가입 폼, 버튼류 등 페이지-특화 컴포넌트를 평평하게(flat) 배치
   - 프로젝트가 커지면 `layout/`, `navigation/`, `sections/` 등 카테고리 폴더 도입을 고려 (아직은 불필요)

> 현재 `next-themes`의 `ThemeProvider`는 `app/layout.tsx`에서 직접 불러와 사용하며, 별도의 `components/providers/theme-provider.tsx` 래퍼 파일은 없습니다.

### lib/ - 유틸리티 및 Supabase 클라이언트 (실제 구조)

```
lib/
├── utils.ts                  # 🛠️ cn() 등 공통 유틸리티
└── supabase/
    ├── client.ts              # 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트
    ├── server.ts               # 서버 컴포넌트/서버 액션용 Supabase 클라이언트
    ├── proxy.ts                 # proxy.ts(구 middleware)에서 사용하는 세션 갱신 헬퍼
    └── database.types.ts        # Supabase generate-types로 생성된 DB 타입
```

**📚 lib/ 폴더 확장 가이드 (새 기능 추가 시):**

```
lib/
├── utils.ts
├── supabase/           # 기존 Supabase 클라이언트들
├── types/              # TypeScript 타입 정의 (필요 시 신설)
├── hooks/              # 커스텀 훅 (필요 시 신설)
├── schemas/            # Zod 스키마 (필요 시 신설)
└── api/                # 외부 API 유틸리티 (필요 시 신설)
```

## 🏷️ 파일 네이밍 컨벤션

### 파일명 규칙

```bash
# ✅ 올바른 파일명 (실제 프로젝트는 전부 kebab-case)
auth-button.tsx
login-form.tsx
theme-switcher.tsx

# ❌ 잘못된 파일명
auth_button.tsx         # snake_case (금지)
AuthButton.tsx          # PascalCase 파일명 (금지, 컴포넌트명 자체는 PascalCase여도 파일명은 kebab-case)
```

### 컴포넌트 네이밍

```typescript
// ✅ 올바른 컴포넌트 네이밍
export function AuthButton() {} // PascalCase
export function LoginForm() {} // PascalCase

// ❌ 잘못된 컴포넌트 네이밍
export function authButton() {} // camelCase (금지)
export function login_form() {} // snake_case (금지)
```

### 폴더 네이밍

```bash
# ✅ 올바른 폴더명
components/             # 소문자
auth/                   # 소문자, kebab-case
sign-up/                # kebab-case

# ❌ 잘못된 폴더명
Components/            # PascalCase (금지)
sign_up/                # snake_case (금지)
```

## 🔗 경로 별칭 (Path Aliases)

`tsconfig.json`의 `paths`와 `components.json`의 `aliases`에 정의된 실제 별칭:

```typescript
// ✅ 경로 별칭 사용 (권장)
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoginForm } from "@/components/login-form";
import { createClient } from "@/lib/supabase/server";

// ❌ 상대 경로 사용 (금지)
import { Button } from "../../components/ui/button";
import { cn } from "../lib/utils";
```

**📍 정의된 별칭 (src/ 없이 루트 기준):**

- `@/*` → `./*` (tsconfig.json 기준 경로)
- `@/components` → `components`
- `@/components/ui` → `components/ui`
- `@/lib` → `lib`
- `@/lib/utils` → `lib/utils`
- `@/hooks` → `hooks` (components.json에 정의되어 있으나 아직 실제 폴더는 없음, 커스텀 훅 추가 시 루트에 `hooks/` 생성)

## 📝 새 파일/폴더 추가 규칙

### 1. 새 UI 컴포넌트 추가

```bash
# shadcn/ui 컴포넌트 추가
npx shadcn@latest add [component-name]

# 커스텀 UI 컴포넌트 추가
components/ui/custom-component.tsx
```

### 2. 새 페이지 추가

```bash
# 정적 페이지
app/about/page.tsx

# 동적 페이지
app/users/[id]/page.tsx

# 그룹 라우트
app/(marketing)/about/page.tsx
```

### 3. 새 비즈니스 컴포넌트 추가

```bash
# 위치 결정 기준:
1. 특정 페이지에서만 사용 → 해당 페이지 폴더 내 (예: app/protected/profile/ 하위)
2. 여러 페이지에서 사용 → components/ 루트 또는 적절한 카테고리 폴더
3. shadcn/ui 파생 기본 컴포넌트 → components/ui/
```

### 4. 새 유틸리티 추가

```bash
# 공통 유틸리티
lib/utils.ts                # 기존 파일에 추가

# Supabase 관련
lib/supabase/                # 기존 폴더에 추가

# 특화된 유틸리티
lib/date-utils.ts           # 새 파일 생성
```

## 🎯 코드 조직 베스트 프랙티스

### 1. 단일 책임 원칙

- 하나의 파일은 하나의 주요 기능만 담당
- 관련된 타입과 유틸리티는 같은 파일에 포함 가능

### 2. 의존성 순서

```typescript
// 1. 외부 라이브러리
import React from "react";
import Link from "next/link";

// 2. 내부 라이브러리 (@/ 경로)
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

// 3. 상대 경로
import "./component.css";
```

### 3. Export 규칙

```typescript
// ✅ Named export 사용 (권장)
export function LoginForm() {}

// ✅ Default export (페이지 컴포넌트)
export default function LoginPage() {}

// ❌ 혼재 사용 지양
export function LoginForm() {}
export default LoginForm; // 같은 컴포넌트를 두 방식으로 export
```

### 4. 파일 크기 관리

- 단일 파일: 300줄 이하 권장
- 300줄 초과 시 분할 고려
- 관련 기능별로 분리

## 🚫 금지사항

### ❌ 피해야 할 구조

```bash
# src/ 디렉토리 도입 (이 프로젝트는 src/ 없이 루트 배치를 사용)
src/app/page.tsx

# 깊은 중첩 구조 (4단계 이상)
components/pages/auth/forms/login/LoginForm.tsx

# 의미 없는 폴더명
components/misc/
components/common/
components/shared/

# 혼재된 케이스
components/userProfile/LoginForm.tsx
```

### ❌ 피해야 할 패턴

```typescript
// 거대한 파일
export function SuperMegaComponent() {
  // 500줄 이상의 코드
}

// 혼재된 import
import Button from "@/components/ui/button"; // default
import { Card } from "@/components/ui/card"; // named

// 깊은 상대 경로
import { utils } from "../../../../lib/utils";
```

## ✅ 체크리스트

새 파일/폴더 추가 시 확인사항:

- [ ] `src/` 없이 루트 기준 경로 사용
- [ ] 적절한 카테고리 폴더에 배치
- [ ] kebab-case 파일명 사용
- [ ] PascalCase 컴포넌트명 사용
- [ ] `@/` 경로 별칭 사용
- [ ] 단일 책임 원칙 준수
- [ ] 적절한 export 방식 선택
- [ ] 의존성 import 순서 준수
- [ ] 파일 크기 300줄 이하 유지

이 가이드를 따라 일관성 있고 유지보수하기 쉬운 프로젝트 구조를 만들어보세요!
