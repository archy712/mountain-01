# 운영 대시보드 · 모니터링 기준 (Task 035)

산길날씨의 KPI 계측과 외부 API 성공률 모니터링 기준을 정의한다. 계측 데이터는 두 테이블에
쌓인다(둘 다 **insert-only RLS**, select 차단 → 집계는 서비스 롤/대시보드에서만).

- `public.analytics_events` — 프라이버시-세이프 KPI 이벤트(개인정보 미수집). `anon_id` 는
  클라이언트 localStorage 의 익명 UUID로, 세션/재방문 dedup 과 완료율·전환율 집계에만 쓴다.
- `public.api_logs` — 외부 공공 API 호출 결과(성공률·응답시간).

집계 SQL은 Supabase SQL Editor(서비스 롤) 또는 대시보드에서 실행한다. 아래 쿼리는 `interval`
윈도를 바꿔 일/주 단위로 재사용한다.

> ⚠️ 프라이버시: `analytics_events` 는 계정·쿠키·IP와 연결하지 않는다. `anon_id` 는 익명
> 식별자일 뿐이며, 재식별에 쓰지 않는다. 원시 이벤트는 90일 보존 후 파기(주기 정리)를 권장.

---

## 1. KPI 정의와 집계 쿼리

계측 이벤트(`analytics_events.event`):

| 이벤트                    | 발생 지점                              | 용도(KPI)              |
| ------------------------- | -------------------------------------- | ---------------------- |
| `session_start`           | 앱 최초 마운트(세션당 1회)             | 주간 세션·재방문율     |
| `search_session`          | 검색 결과 첫 노출(세션당 1회)          | 검색 완료율 분모       |
| `search_result_selected`  | 검색 후보 선택→상세 진입               | 검색 완료율 분자       |
| `mountain_view`           | 산 상세 진입                           | 완료 검증·즐겨찾기 분모 |
| `favorite_add` / `_remove`| 즐겨찾기 토글 성공                     | 즐겨찾기 등록 비율     |
| `pwa_prompt_shown`        | 설치 배너 실제 노출                    | 설치 전환 분모         |
| `pwa_install_accepted` / `_dismissed` | 설치 프롬프트 사용자 선택 | 설치 전환 분자         |
| `app_installed`           | `appinstalled` 이벤트                  | 실제 설치 수           |

### 1-1. 주간 검색 세션 수

```sql
-- 최근 7일 순 세션 수(중복 anon_id 제거) 및 검색 포함 세션 수
select
  count(distinct anon_id) filter (where event = 'session_start')  as sessions,
  count(distinct anon_id) filter (where event = 'search_session') as search_sessions
from public.analytics_events
where created_at >= now() - interval '7 days';
```

### 1-2. 검색 → 결과 확인 완료율

세션(anon_id) 기준: 검색한 사용자 중 후보를 선택해 상세로 진입한 비율.

```sql
with per_user as (
  select
    anon_id,
    bool_or(event = 'search_session')         as searched,
    bool_or(event = 'search_result_selected') as selected
  from public.analytics_events
  where created_at >= now() - interval '7 days'
    and anon_id is not null
  group by anon_id
)
select
  count(*) filter (where searched)              as searched_users,
  count(*) filter (where searched and selected) as completed_users,
  round(
    100.0 * count(*) filter (where searched and selected)
      / nullif(count(*) filter (where searched), 0), 1
  ) as completion_rate_pct
from per_user;
```

### 1-3. 7일 재방문율

가입 없이 `anon_id` 로 측정. 서로 다른 날짜에 2회 이상 등장한 익명 사용자 비율.

```sql
with days as (
  select anon_id, count(distinct date_trunc('day', created_at)) as active_days
  from public.analytics_events
  where event = 'session_start'
    and created_at >= now() - interval '7 days'
    and anon_id is not null
  group by anon_id
)
select
  count(*)                              as total_users,
  count(*) filter (where active_days >= 2) as returning_users,
  round(100.0 * count(*) filter (where active_days >= 2) / nullif(count(*), 0), 1)
    as retention_7d_pct
from days;
```

### 1-4. 즐겨찾기 등록 비율

상세를 본 사용자 중 즐겨찾기를 추가한 익명 사용자 비율.

```sql
with per_user as (
  select
    anon_id,
    bool_or(event = 'mountain_view') as viewed,
    bool_or(event = 'favorite_add')  as favorited
  from public.analytics_events
  where created_at >= now() - interval '7 days'
    and anon_id is not null
  group by anon_id
)
select
  round(100.0 * count(*) filter (where viewed and favorited)
    / nullif(count(*) filter (where viewed), 0), 1) as favorite_rate_pct
from per_user;
```

### 1-5. PWA 설치 전환율

```sql
select
  count(*) filter (where event = 'pwa_prompt_shown')       as prompts,
  count(*) filter (where event = 'pwa_install_accepted')   as accepted,
  count(*) filter (where event = 'app_installed')          as installed,
  round(100.0 * count(*) filter (where event = 'pwa_install_accepted')
    / nullif(count(*) filter (where event = 'pwa_prompt_shown'), 0), 1)
    as install_conversion_pct
from public.analytics_events
where created_at >= now() - interval '30 days';
```

---

## 2. 외부 API 성공률 · 응답시간

`api_logs` 는 `withStaleFallback`(lib/api/cache.ts)이 소스별 호출마다 fire-and-forget 로 적재한다.

- `status`: `success`(신선 조회 성공) · `stale`(실패했으나 마지막 성공 캐시로 폴백) · `failure`(사용 불가)
- `source`: `weather` · `air` · `uv` (탐방로는 정적 CSV라 API 쿼터·모니터링 대상 아님. `vilage`/`trails` 는 스키마상 예약)
- `latency_ms`: **요청 관찰 지연**. `'use cache'` 히트 시 near-zero이므로 절대 네트워크 지연이
  아니라 "효과 지연"으로 해석한다. 성공/폴백/실패 분포는 캐시와 무관하게 정확하다.

### 2-1. 소스별 성공률·지연 (최근 24시간)

```sql
select
  source,
  count(*)                                          as calls,
  round(100.0 * count(*) filter (where status = 'success') / count(*), 1) as success_pct,
  round(100.0 * count(*) filter (where status = 'stale')   / count(*), 1) as stale_pct,
  round(100.0 * count(*) filter (where status = 'failure') / count(*), 1) as failure_pct,
  percentile_cont(0.5)  within group (order by latency_ms) as p50_ms,
  percentile_cont(0.95) within group (order by latency_ms) as p95_ms
from public.api_logs
where created_at >= now() - interval '24 hours'
group by source
order by source;
```

성공률 지표 정의: **가용률 = success + stale**(사용자에게 데이터가 노출된 비율), **신선 성공률 =
success**. 목표(아래)는 가용률 기준으로 본다.

### 2-2. 최근 실패 원인 분포

```sql
select source, error_kind, count(*) as n
from public.api_logs
where status = 'failure' and created_at >= now() - interval '24 hours'
group by source, error_kind
order by n desc;
```

---

## 3. 실패 알림 기준 (임계치)

> 이 버전은 **기준 문서화**까지다. 실제 알림 채널(웹훅/이메일) 연동은 후속 과제(§5).

| 심각도 | 조건                                                             | 대응                                     |
| ------ | ---------------------------------------------------------------- | ---------------------------------------- |
| 주의   | 특정 소스 가용률(success+stale) < 98% 가 15분 지속               | 원인 확인(§2-2), 공공 API 상태 점검      |
| 경고   | 특정 소스 **신선 성공률(success)** < 95% 가 15분 지속            | 쿼터/키 만료 점검, stale 폴백 정상 여부  |
| 위험   | 특정 소스 가용률 < 90% 또는 p95 latency > 8s(타임아웃) 30분 지속 | 키 재발급/소스 폴백, 사용자 공지 검토    |

**성공률 목표(단계별, 가용률 기준)**: 1단계 **95%** → 2단계 97% → 3단계 **98%**.
공공 API 쿼터/장애가 주된 위험이므로, stale 폴백("N분 전 기준")이 정상 동작하는 한 사용자
체감 가용률은 목표를 유지한다(결정 003 캐싱 일원화 + 위험 대응표 참조).

수동 점검 주기: 배포 직후 24시간은 §2-1 을 1~2회/일 확인, 안정화 후 주 1회.

---

## 4. 보안 · 시크릿 점검 (배포 전 필수)

- `mcp__supabase__get_advisors`(security) 확인. Task 035 신규 테이블(`analytics_events`·
  `api_logs`)은 RLS 활성 + insert-only 정책이라 **추가 경고 0건**이다. 남은 항목은 코드 무관
  프로젝트 설정 1건뿐: `auth_leaked_password_protection`(WARN) — Supabase 대시보드 **Auth →
  Policies** 에서 HaveIBeenPwned 유출 비밀번호 차단을 켜면 해소된다(배포 전 활성화 권장).
- 서버 전용 키(`KMA_*`, `AIRKOREA_*`, `SUPABASE_SERVICE_ROLE_KEY`)는 `NEXT_PUBLIC_` 접두사가
  없어 클라이언트 번들에 포함되지 않는다(`lib/env.ts`). `lib/api/fetcher.ts`·`lib/api/metrics.ts`
  의 `typeof window` 가드가 서버 전용 모듈의 클라이언트 유입을 차단한다.
- 상세 체크리스트는 [`deployment.md`](./deployment.md) 참조.

---

## 5. 후속 과제 (이번 범위 밖)

- 실제 알림 채널 연동(Slack/Discord 웹훅 또는 이메일): Supabase `pg_cron` + Edge Function 으로
  §3 임계치를 주기 평가해 발송.
- KPI 대시보드 시각화(Supabase 대시보드 차트 또는 별도 관리 페이지).
- `analytics_events` 90일 보존 정리 잡(`pg_cron`).
