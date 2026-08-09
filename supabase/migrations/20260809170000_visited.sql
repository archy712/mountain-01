-- 방문완료 기록 테이블 (Task 037). 즐겨찾기(favorites)와 동일한 본인 전용 패턴.
-- 요약:
--   visited : 본인(auth.uid()=user_id) select/insert/delete, (user_id, mountain_id) 유니크
-- 서비스 롤은 RLS 를 우회하므로 쓰기용 별도 정책은 두지 않는다.
-- 멱등: 테이블/인덱스는 if not exists, 정책은 drop if exists 후 재생성한다.

-- ── visited: 방문완료 기록 (Phase 7) ─────────────────────────────
create table if not exists public.visited (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mountain_id uuid not null references public.mountains (id) on delete cascade,
  visited_at timestamptz not null default now(), -- 방문 일시(정렬 기준)
  note text, -- 방문 메모(선택)
  created_at timestamptz not null default now(),
  unique (user_id, mountain_id) -- 산별 방문완료는 토글(중복 방지)
);

comment on table public.visited is '사용자 방문완료 기록 (본인 행만 접근)';

create index if not exists visited_user_id_idx on public.visited (user_id);
-- (user_id, mountain_id) 유니크는 mountain_id 단독 FK 를 커버하지 않아 별도 인덱스
create index if not exists visited_mountain_id_idx on public.visited (mountain_id);

-- ── RLS: 본인 행만 select/insert/delete ──────────────────────────
alter table public.visited enable row level security;

drop policy if exists "visited_select_own" on public.visited;
create policy "visited_select_own"
  on public.visited for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "visited_insert_own" on public.visited;
create policy "visited_insert_own"
  on public.visited for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "visited_delete_own" on public.visited;
create policy "visited_delete_own"
  on public.visited for delete
  to authenticated
  using ((select auth.uid()) = user_id);
