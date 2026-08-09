# Task 037: 방문완료 기록 및 방문 목록 화면

> Phase 7 (개인화·콘텐츠 확장) / 우선순위
> 다녀온 산을 기록하고 방문일 순으로 되짚어 볼 수 있는 개인화 기능. 즐겨찾기(Task 026)와 동일한 본인 전용 패턴을 재사용한다.

## 목표

산 상세에서 "방문완료"를 토글로 기록하고, 별도 목록 화면(`/visited`)에서 다녀온 산을 방문일 순으로 확인·해제한다. 즐겨찾기가 "가고 싶은 산"이라면 방문완료는 "다녀온 산"으로, 두 개인화 축을 나눈다.

## 설계 결정 (이 Task에서 확정)

- **DB**: 별도 `visited` 테이블(`user_id`, `mountain_id`, `visited_at`, `note` optional, `(user_id, mountain_id)` 유니크). 산별 방문완료는 **토글**이라 유니크로 중복을 막고, POST 유니크 충돌(23505)은 멱등 성공 처리한다. RLS 는 본인 행만 select/insert/delete(즐겨찾기와 동일). `visited_at` 은 정렬 기준.
- **상세 토글**: 하트(즐겨찾기) 옆에 `CircleCheck` 버튼(status-open 색)을 둔다. 두 버튼을 한 액션 슬롯(`MountainDetail`의 `action`)에 flex 로 배치하고, 서버 `DetailActions` 가 세션 확인 1회 뒤 즐겨찾기·방문완료 초기 상태를 **병렬 조회**한다. 토글은 낙관적 업데이트 + 실패 롤백(`favorite-button` 로직 복제).
- **목록 화면**: 전용 `/visited` 라우트. 산 메타 + 방문일(KST `YYYY.MM.DD`)만 즉시 렌더한다 — 방문 "기록"이므로 컨디션 점수(외부 API)를 붙이지 않는다(즐겨찾기의 카드별 점수 스트리밍 불필요). `visited_at` 내림차순. 인라인 삭제는 낙관적 제거·롤백(`favorites-list` 패턴).
- **보호 라우트**: `/visited` 는 `proxy.ts` 공개 경로가 아니므로 자동으로 인증 게이트에 걸리고(→ `/auth/login?next=/visited`), 서버 컴포넌트가 `getClaims()` 로 이중 방어한다. proxy 수정 불필요.
- **계측**(best-effort, 선택): `visited_add`/`visited_remove`. 이벤트명은 **3곳**에 함께 등록해야 insert 가 성립한다 — 클라이언트 `AnalyticsEvent` 타입, API 라우트 화이트리스트, 그리고 **`analytics_events.event` DB CHECK 제약**. CHECK 누락 시 fire-and-forget insert 가 조용히 거부되므로(사용자 흐름엔 영향 없음) 별도 마이그레이션으로 CHECK 를 확장했다.
- **네비**: 헤더(`auth-button.tsx`)에 "방문완료" 링크를 즐겨찾기 옆에 추가. Task 038 마이페이지에서 이 진입점들을 통합 검토한다.

## 관련 파일

**신규**

- `supabase/migrations/20260809170000_visited.sql` — `visited` 테이블 + 인덱스 + RLS(멱등).
- `supabase/migrations/20260809180000_analytics_visited_events.sql` — `analytics_events_event_check` 재정의(visited 이벤트 2종 추가).
- `app/api/visited/route.ts` — POST/DELETE, `getClaims()` 세션 → RLS, 유니크 충돌 멱등.
- `components/visited-button.tsx` — 상세 토글(낙관적 업데이트·롤백·로그인 유도).
- `components/visited-list.tsx` — 목록 클라이언트(인라인 삭제·빈 상태).
- `components/visited-list-skeleton.tsx` — 로딩 스켈레톤(LoadingBar·aria-busy).
- `app/(main)/visited/page.tsx` — 목록 라우트(이중 방어·KST 방문일 포맷).

**수정**

- `app/(main)/mountains/[id]/page.tsx` — `FavoriteAction` → `DetailActions`(즐겨찾기+방문완료 병렬 조회, 두 버튼 배치).
- `components/auth-button.tsx` — 헤더 "방문완료" 링크 추가.
- `lib/analytics/client.ts` — `AnalyticsEvent` 에 visited 2종 추가.
- `app/api/analytics/route.ts` — 화이트리스트에 visited 2종 추가.
- `lib/supabase/database.types.ts` — `visited` 테이블 타입 재생성.

## 테스트 (Playwright MCP · 지리산)

1. `sangil-e2e@example.com` 로그인 → 상세 진입, 헤더 액션에 방문완료·즐겨찾기 두 버튼 렌더 확인.
2. "방문완료 기록" 클릭 → 버튼 `pressed`("방문완료 해제")로 전환, `visited` 행 insert 확인.
3. `/visited` 목록에 지리산 + 방문일(`2026.08.09`) + 지역·고도 노출, 헤더 네비 링크 확인.
4. 목록 인라인 해제 클릭 → 낙관적 제거로 빈 상태 노출, `visited` 행 삭제(0건) 확인.
5. 상세에서 해제→재기록으로 `visited_add`·`visited_remove` 계측 각 1건 적재 확인(초기엔 DB CHECK 누락으로 미적재 → 마이그레이션 후 정상).
6. 콘솔 에러 0, `typecheck`·`lint`·`format:check`·`build` 통과.

> 테스트 계정 비밀번호는 `auth.users` 에 pgcrypto `crypt(..., gen_salt('bf'))` 로 설정(example.com E2E 전용).
