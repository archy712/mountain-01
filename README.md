# 산길날씨 (SanGil)

> 산 이름 하나로 **"지금 이 산에 가도 되는지"**를 출발 전 3초 안에 판단하게 해주는 등산 날씨·탐방로 통합 모바일 웹 앱

산길날씨는 흩어진 정보(기상청 날씨, 탐방로 개방 여부, 미세먼지·자외선)를 하나의 결론으로 압축해 보여줍니다. 주말·휴일 산행을 계획하는 등산객이 스마트폰으로 빠르게 판단할 수 있도록 모바일 우선으로 설계합니다.

> ⚠️ **개발 초기 단계입니다.** 제품 기획(PRD)과 개발 로드맵이 확정되었고, 현재 외부 데이터 소스 검증(Phase 0)을 진행 중입니다. 코드베이스는 Next.js + Supabase 스타터 킷을 기반으로 하며 기능 구현이 순차적으로 진행됩니다. 상세 범위는 [`docs/PRD.md`](docs/PRD.md), [`docs/ROADMAP.md`](docs/ROADMAP.md)를 참고하세요.

## 주요 기능 (단계별)

| 단계            | 범위                                                          | 상태 |
| --------------- | ------------------------------------------------------------- | ---- |
| **1단계 (MVP)** | 산 이름 검색 → 오늘 날씨 + 탐방로 개방 여부                   | 예정 |
| **2단계**       | 미세먼지·자외선 통합 "등산 컨디션 점수" + 날씨 기반 장비 추천 | 예정 |
| **3단계**       | 카카오맵 등산로 오버레이, PWA(홈 화면 추가), 오프라인 폴백    | 예정 |

## 향후 개발 계획 (상세 화면 확장)

산 상세 화면에 더 풍부한 정보를 제공하기 위한 확장 계획입니다. 아래 항목은 **신규 외부 데이터 소스 확보가 필요**해 별도 개발 단계로 계획합니다. (이미 연동된 기상·대기·자외선·탐방로 데이터를 활용한 확장은 순차 반영됩니다.)

| 항목                        | 내용                                                               | 필요 데이터 소스                    |
| --------------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| **실시간 통제·공지**        | 국립공원 실시간 입산 통제·안전 공지(정적 CSV 스냅샷이 아닌 실시간) | 국립공원공단 실시간 API/공지        |
| **산불위험지수·입산통제**   | 산불 위험 등급, 산불 조심 기간 입산 통제 현황                      | 산림청 산불위험예보                 |
| **주차·교통·입장료**        | 주차장 위치·혼잡도, 대중교통 접근, 입장/주차 요금                  | 지자체·공영주차장·대중교통 API      |
| **편의시설**                | 화장실·대피소·식수대·매점 위치                                     | 국립공원 시설 데이터·지도 POI       |
| **전망 사진·포토스팟**      | 정상·주요 지점 전망 사진, 추천 포토스팟                            | 이미지 저장소·큐레이션              |
| **사용자 후기·별점**        | 방문자 리뷰, 코스별 별점·난이도 체감                               | 자체 리뷰 DB(신규 스키마·인증 연계) |
| **계절 명소·야생동물 주의** | 단풍·설경 등 시즌 정보, 곰·멧돼지 등 야생동물 출몰 주의            | 국립공원 계절 콘텐츠·안전 공지      |

## 기술 스택

| 영역        | 스택                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------- |
| 프레임워크  | Next.js 16 App Router (`proxy.ts`, `cacheComponents: true`)                                 |
| 언어        | TypeScript (strict)                                                                         |
| 백엔드/인증 | Supabase (`@supabase/ssr`, 쿠키 기반 세션)                                                  |
| 스타일      | Tailwind CSS v4 + shadcn/ui (`new-york`) — `tailwind.config.ts` + `@config` 하이브리드      |
| 지도        | 카카오맵 JS SDK (3단계)                                                                     |
| 외부 API    | 기상청 단기예보·생활기상지수(자외선), 에어코리아 대기오염정보, 국립공원공단 탐방로 개방정보 |
| 배포 형태   | 모바일 웹 우선 반응형 → PWA (3단계)                                                         |

## 시작하기

### 요구사항

- Node.js 20+ (개발 환경 Node 26 기준)
- npm
- Supabase 프로젝트 ([대시보드](https://database.new)에서 생성)

### 설치

```bash
npm install
```

### 환경변수

프로젝트 루트에 `.env.local`을 만들고 다음 값을 설정합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=[Supabase 프로젝트 URL]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[Supabase publishable(또는 anon) 키]
```

> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`는 Supabase의 신규 **publishable** 키 형식을 가리킵니다. 전환기 동안 기존 **anon** 키 값도 이 변수명으로 사용할 수 있습니다. 두 값 모두 [프로젝트 API 설정](https://supabase.com/dashboard/project/_?showConnect=true)에서 확인할 수 있습니다.
>
> 두 값이 없으면 `lib/utils.ts`의 `hasEnvVars`가 `false`가 되어 UI가 튜토리얼/경고 모드로 폴백합니다.

외부 데이터 연동(1단계 이후)에 필요한 공공데이터 API 키는 서버 전용 환경변수(`KMA_SERVICE_KEY`, `AIRKOREA_SERVICE_KEY`, `KMA_LIVING_INDEX_KEY`, `TRAIL_API_KEY` 등)로 추가됩니다. 발급 방법과 결정 사항은 [`docs/decisions/001-data-sources.md`](docs/decisions/001-data-sources.md)를 참고하세요.

### 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 사용 가능한 스크립트

```bash
npm run dev          # 개발 서버 (HTTP 헤더 크기 제한 32768로 실행)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 실행
npm run lint         # ESLint 검사
npm run lint:fix     # ESLint 자동 수정
npm run typecheck    # 타입 체크 (tsc --noEmit)
npm run format       # Prettier 전체 포맷
npm run format:check # 포맷 위반 검사
```

## 프로젝트 구조

```
app/                 # App Router 라우트 (인증 흐름, 보호 영역)
  auth/              # 로그인·회원가입·비밀번호 재설정·이메일 확인
  protected/         # 인증 필요 영역
components/          # 페이지별 컴포넌트 (kebab-case), PascalCase 컴포넌트명
  ui/                # shadcn/ui 프리미티브
lib/
  supabase/          # client.ts · server.ts · proxy.ts (컨텍스트별 클라이언트 3종)
  utils.ts           # cn() 등 유틸
proxy.ts             # 루트 프록시 (구 middleware) — 세션 갱신·라우트 보호
docs/                # PRD · ROADMAP · 결정 기록 · 개발 가이드
```

- `src/` 디렉토리를 사용하지 않으며, 경로 별칭 `@/*`는 프로젝트 루트로 매핑됩니다.
- Supabase 클라이언트는 컨텍스트별로 반드시 구분해 사용합니다(Client Component / Server Component·Route Handler / proxy). 세부 규칙은 [`CLAUDE.md`](CLAUDE.md) 참고.

## 코드 품질 자동화

- **커밋 전 검사**: husky `pre-commit` 훅이 `lint-staged`를 실행합니다. 스테이징된 `*.{ts,tsx}`는 **전체 타입 체크(`tsc --noEmit`) → `eslint --fix` → `prettier --write`** 순으로 검사되며, 타입 오류가 있으면 커밋이 차단됩니다.
- **Prettier + Tailwind**: `prettier-plugin-tailwindcss`로 클래스가 자동 정렬됩니다(`cn`/`clsx`/`cva` 인식).
- **VS Code**: `.vscode/settings.json`에 저장 시 자동 포맷 + ESLint 자동 수정이 설정되어 있습니다. 권장 확장은 프로젝트를 열면 설치가 제안됩니다.

## 문서

| 문서                                 | 내용                                           |
| ------------------------------------ | ---------------------------------------------- |
| [`docs/PRD.md`](docs/PRD.md)         | 제품 요구사항 정의서                           |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phase/Task 기반 개발 로드맵                    |
| [`docs/decisions/`](docs/decisions/) | 기술 결정 기록 (외부 데이터 소스·API 선정 등)  |
| [`docs/guides/`](docs/guides/)       | 아키텍처·스타일·폼 처리·Next.js 16 상세 가이드 |
| [`CLAUDE.md`](CLAUDE.md)             | 코드베이스 작업 가이드 (아키텍처·컨벤션)       |

---

이 프로젝트는 [Next.js and Supabase Starter Kit](https://github.com/vercel/next.js/tree/canary/examples/with-supabase)을 기반으로 시작되었습니다.
