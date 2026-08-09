# 배포 · CI 가이드 (Task 035)

산길날씨(Next.js 16 App Router + Supabase)의 CI 파이프라인과 프로덕션(Vercel) 배포 절차,
그리고 배포 전 시크릿 점검 체크리스트를 정리한다.

> 실제 프로덕션 배포 트리거는 인프라 소유자(레포/Vercel 계정 보유자)가 수행한다. 이 문서는
> 그 절차와 필요한 환경변수를 표준화한다.

---

## 1. CI (GitHub Actions)

`.github/workflows/ci.yml` 이 `master` 로의 push/PR 마다 품질 게이트를 강제한다.

순서: `npm ci` → **typecheck → lint → format:check → build**. husky `pre-commit` 은 스테이징
파일만 검사하므로, CI 는 전체 트리를 재검증하는 최종 방어선이다.

### 필수 저장소 Secrets

`build` 단계의 `/mountains/[id]` `generateStaticParams` 가 빌드타임에 Supabase 에서 산 목록을
읽는다(Cache Components 는 빈 `generateStaticParams` 결과를 허용하지 않음). 따라서 아래 **두 개**를
저장소 Secrets 로 등록해야 빌드가 통과한다. 둘 다 클라이언트에 노출되는 **publishable(anon)** 값이라
Secrets 에 두어도 안전하다.

| Secret 이름                            | 값                                       |
| -------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | 프로젝트 URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable(anon) 키                      |

등록: GitHub 리포지토리 → **Settings → Secrets and variables → Actions → New repository secret**.

서버 전용 키(`KMA_*`, `AIRKOREA_*`, `SUPABASE_SERVICE_ROLE_KEY`)는 `lib/env.ts` 가 **지연 평가**
하므로 빌드에는 불필요하다(런타임에만 필요). CI 빌드에 넣지 않는다.

---

## 2. Vercel 프로덕션 배포

### 2-1. 프로젝트 연결

1. Vercel → **Add New → Project** → GitHub `archy712/mountain-01` import.
2. Framework: Next.js(자동 감지). Root/빌드 명령은 기본값 사용(`next build`).
3. Node.js 버전 22 이상.

### 2-2. 환경변수 등록 (Production/Preview)

`.env.local.example` 과 1:1 대조해 아래를 등록한다. **서버 전용 키는 절대 `NEXT_PUBLIC_` 접두사를
붙이지 않는다.**

| 변수                                   | 노출        | 필수/선택 | 용도                                    |
| -------------------------------------- | ----------- | --------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | 클라이언트  | 필수      | Supabase 프로젝트 URL                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 클라이언트  | 필수      | publishable(anon) 키                    |
| `KMA_SERVICE_KEY`                      | **서버 전용** | 필수      | 기상청 단기예보                         |
| `AIRKOREA_SERVICE_KEY`                 | **서버 전용** | 필수      | 에어코리아 대기질                       |
| `KMA_LIVING_INDEX_KEY`                 | **서버 전용** | 필수      | 기상청 생활기상지수(자외선)             |
| `SUPABASE_SERVICE_ROLE_KEY`            | **서버 전용** | 선택      | `condition_scores` 점수 캐시 write      |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`      | 클라이언트  | 선택      | Google 로그인 버튼 노출(`"true"`)       |
| `NEXT_PUBLIC_KAKAO_MAP_KEY`            | 클라이언트  | 선택      | 카카오맵 JS 키(도메인 등록 후)          |

> 탐방로는 국립공원공단 정적 CSV라 API 키가 필요 없다(`docs/decisions/001-data-sources.md` #4).

### 2-3. Supabase 마이그레이션 반영

배포 대상 Supabase 프로젝트에 `supabase/migrations/*` 가 모두 적용됐는지 확인한다. 특히 Task 035
의 `20260809150000_analytics_and_api_logs.sql`(계측 테이블 2종 + insert-only RLS).

### 2-4. 배포 트리거 / 롤백

- **배포**: `master` push 시 Vercel 자동 배포(또는 대시보드 **Deploy**). 사전에 CI 초록 확인.
- **프리뷰**: PR마다 Preview URL 자동 생성.
- **롤백**: Vercel → Deployments → 이전 정상 배포에서 **Promote to Production**(코드 되돌림 불필요).

---

## 3. 배포 전 시크릿 · 보안 체크리스트

- [ ] `mcp__supabase__get_advisors`(security): 신규 테이블(`analytics_events`·`api_logs`) RLS
      경고 0건. 남은 `auth_leaked_password_protection`(WARN)은 대시보드 Auth 설정으로 활성화 권장.
- [ ] 서버 전용 키에 `NEXT_PUBLIC_` 접두사가 **없다**(클라이언트 번들 유출 방지, `lib/env.ts`).
- [ ] `.env.local` 은 커밋되지 않았다(`.gitignore` 대상). CI/Vercel 에는 Secrets/환경변수로만 주입.
- [ ] 서버 전용 모듈(`lib/api/fetcher.ts`·`lib/api/metrics.ts`)의 `typeof window` 가드 유지.
- [ ] 계측 테이블(`analytics_events`·`api_logs`)이 **insert-only**(select 정책 없음)로 유지.
- [ ] `npm run typecheck && npm run lint && npm run format:check && npm run build` 로컬 통과.
- [ ] 모니터링 기준([`monitoring.md`](./monitoring.md)) 확인 — 배포 직후 24시간 성공률 점검.

---

## 4. 후속 과제 (이번 범위 밖)

- CI 에서 Playwright MCP 기반 스모크 E2E(현재 E2E 는 로컬 수동, `docs/ROADMAP.md`).
- 배포 후 성공률/알림 자동화(→ [`monitoring.md`](./monitoring.md) §5).
