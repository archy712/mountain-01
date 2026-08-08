-- 산길날씨 RLS 정책 (결정 003 RLS 표).
-- 요약:
--   mountains/trails      : 공개 select, 쓰기 차단(서비스 롤만)
--   condition_scores      : 공개 select, 쓰기 차단(서버 계산=서비스 롤만)
--   favorites             : 본인(auth.uid()=user_id) select/insert/delete
--   search_logs           : insert 공개 허용, select 차단
-- 서비스 롤은 RLS 를 우회하므로 쓰기용 별도 정책은 두지 않는다.
-- 멱등: 정책은 drop if exists 후 재생성한다. (적용은 Task 014)

-- ── mountains: 공개 읽기 전용 ─────────────────────────────────────
alter table public.mountains enable row level security;

drop policy if exists "mountains_public_select" on public.mountains;
create policy "mountains_public_select"
  on public.mountains for select
  to anon, authenticated
  using (true);

-- ── trails: 공개 읽기 전용 ────────────────────────────────────────
alter table public.trails enable row level security;

drop policy if exists "trails_public_select" on public.trails;
create policy "trails_public_select"
  on public.trails for select
  to anon, authenticated
  using (true);

-- ── condition_scores: 공개 읽기, 쓰기는 서비스 롤만 ───────────────
alter table public.condition_scores enable row level security;

drop policy if exists "condition_scores_public_select" on public.condition_scores;
create policy "condition_scores_public_select"
  on public.condition_scores for select
  to anon, authenticated
  using (true);

-- ── favorites: 본인 행만 select/insert/delete ─────────────────────
alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
  on public.favorites for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
  on public.favorites for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
  on public.favorites for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ── search_logs: insert 공개 허용, select 차단 ───────────────────
alter table public.search_logs enable row level security;

drop policy if exists "search_logs_public_insert" on public.search_logs;
create policy "search_logs_public_insert"
  on public.search_logs for insert
  to anon, authenticated
  with check (true);
-- select 정책 없음 → 조회 차단(분석은 서비스 롤/대시보드에서만)
