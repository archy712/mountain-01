-- Task 035: 계측·모니터링 테이블 2종 (analytics_events, api_logs)
--
-- 공통 원칙: search_logs 와 동일한 insert-only 패턴.
--   - anon/authenticated 는 insert 만 가능, select 정책 없음 → 조회 차단.
--   - 집계/조회는 서비스 롤(서버) 또는 대시보드에서만 수행(개인정보 미수집).

-- ── analytics_events: 프라이버시-세이프 KPI 이벤트 로그 ──────────────
-- anon_id 는 클라이언트가 localStorage 에 생성한 익명 UUID(개인 식별 불가).
-- 세션/재방문 dedup 과 완료율·전환율 집계에만 쓰인다.
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null check (
    event in (
      'session_start',
      'search_session',
      'search_result_selected',
      'mountain_view',
      'favorite_add',
      'favorite_remove',
      'pwa_prompt_shown',
      'pwa_install_accepted',
      'pwa_install_dismissed',
      'app_installed'
    )
  ),
  anon_id text, -- 익명 클라이언트 식별자(localStorage), PII 아님
  mountain_id uuid references public.mountains (id) on delete set null,
  props jsonb, -- 이벤트별 부가값(선택)
  created_at timestamptz not null default now()
);

comment on table public.analytics_events is 'KPI 이벤트 로그 (insert-only, 개인정보 미수집, anon_id 는 익명 식별자)';

create index if not exists analytics_events_event_created_idx
  on public.analytics_events (event, created_at desc);
create index if not exists analytics_events_anon_created_idx
  on public.analytics_events (anon_id, created_at desc);

alter table public.analytics_events enable row level security;
drop policy if exists "analytics_events_public_insert" on public.analytics_events;
create policy "analytics_events_public_insert"
  on public.analytics_events for insert
  to anon, authenticated
  with check (true);
-- select 정책 없음 → 조회 차단(집계는 서비스 롤/대시보드에서만)

-- ── api_logs: 외부 공공 API 호출 결과(성공률·응답시간) ──────────────
-- 서버(withStaleFallback)가 anon 클라이언트로 fire-and-forget insert.
create table if not exists public.api_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('weather', 'vilage', 'air', 'uv', 'trails')),
  status text not null check (status in ('success', 'stale', 'failure')),
  latency_ms integer,
  error_kind text, -- ApiError.kind (실패/폴백 시)
  created_at timestamptz not null default now()
);

comment on table public.api_logs is '외부 API 호출 로그 (insert-only, 성공률·지연 모니터링용)';

create index if not exists api_logs_source_created_idx
  on public.api_logs (source, created_at desc);
create index if not exists api_logs_status_created_idx
  on public.api_logs (status, created_at desc);

alter table public.api_logs enable row level security;
drop policy if exists "api_logs_public_insert" on public.api_logs;
create policy "api_logs_public_insert"
  on public.api_logs for insert
  to anon, authenticated
  with check (true);
-- select 정책 없음 → 조회 차단(집계는 서비스 롤/대시보드에서만)
