-- 사용자 후기·별점 (Task 048). 방문완료(visited)·프로필 위에 얹는 공개 리뷰.
-- 요약:
--   reviews        : 공개 select(숨김 제외 + 본인), 방문완료(visited)한 산만 insert,
--                    본인 update/delete. (user_id, mountain_id) 유니크 → 산별 1인 1후기(수정으로 갱신).
--   review_reports : 신고 기록. RLS 잠금(정책 없음) — 오직 report_review() 정의자 함수만 기록.
--   report_review(): SECURITY DEFINER RPC. 중복 신고 방지 + 누적 임계치(3회) 도달 시 is_hidden 자동 전환.
-- 설계 메모:
--   - 작성 자격은 RLS insert with_check 에서 visited EXISTS 로 강제(결정: 방문완료한 산만).
--   - 모더레이션(report_count·is_hidden)은 사용자 직접 UPDATE 로 조작 불가하도록
--     BEFORE UPDATE 트리거가 두 컬럼을 OLD 로 되돌린다. 정의자 함수만 GUC(app.moderation)로 통과.
--   - 리뷰어 표시명은 author_name 으로 작성 시점 스냅샷(프로필은 본인만 조회 RLS 라 조인 불가).
-- 멱등: 테이블/인덱스는 if not exists, 정책·트리거는 drop if exists 후 재생성.

-- ── reviews: 산별 별점·후기 (Phase 11) ───────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mountain_id uuid not null references public.mountains (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5), -- 별점 필수(1~5)
  body text, -- 후기 본문(선택)
  author_name text, -- 작성 시점 표시명 스냅샷(프로필 비공개 RLS 회피용). 없으면 UI 폴백.
  report_count int not null default 0, -- 누적 신고 수(정의자 함수만 갱신)
  is_hidden boolean not null default false, -- 임계치 초과 자동 숨김(정의자 함수만 갱신)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mountain_id) -- 산별 1인 1후기(중복 방지, 재작성은 update)
);

comment on table public.reviews is '산별 사용자 후기·별점 (공개 read, 방문완료한 산만 작성)';

-- 상세 화면은 산별 최신순 조회 → (mountain_id, created_at desc) 커버링.
create index if not exists reviews_mountain_created_idx
  on public.reviews (mountain_id, created_at desc);
create index if not exists reviews_user_id_idx on public.reviews (user_id);

-- ── review_reports: 신고 기록(중복 방지) ─────────────────────────
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id) -- 한 사람이 같은 후기를 중복 신고 불가
);

comment on table public.review_reports is '후기 신고 기록 (report_review() 정의자 함수만 기록)';

create index if not exists review_reports_review_id_idx
  on public.review_reports (review_id);

-- ── BEFORE UPDATE 트리거: updated_at 갱신 + 모더레이션 컬럼 가드 ──
-- 일반 UPDATE(본인 후기 수정)는 report_count·is_hidden 을 절대 바꾸지 못한다(OLD 로 복원).
-- report_review() 정의자 함수만 트랜잭션-로컬 GUC(app.moderation='on')로 이 가드를 통과한다.
create or replace function public.reviews_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if current_setting('app.moderation', true) is distinct from 'on' then
    new.report_count = old.report_count;
    new.is_hidden = old.is_hidden;
  end if;
  return new;
end;
$$;

-- 트리거 전용 함수라 REST RPC 로 노출될 필요가 없다(보안 린트 0028/0029 대응).
revoke execute on function public.reviews_before_update() from public;

drop trigger if exists reviews_set_before_update on public.reviews;
create trigger reviews_set_before_update
  before update on public.reviews
  for each row execute function public.reviews_before_update();

-- ── report_review(): 신고 접수 + 임계치 자동 숨김 (SECURITY DEFINER) ──
-- 신고자는 타인 후기라 직접 UPDATE 권한이 없으므로, 정의자 권한으로 집계·숨김을 처리한다.
-- 로그인(auth.uid()) 필수, 중복 신고는 조용히 멱등 처리. 임계치 3회 이상이면 is_hidden 전환.
create or replace function public.report_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  -- 대상 후기가 없으면(잘못된 id) 조용히 종료.
  if not exists (select 1 from public.reviews where id = p_review_id) then
    return;
  end if;

  insert into public.review_reports (review_id, reporter_id)
  values (p_review_id, v_uid)
  on conflict (review_id, reporter_id) do nothing;

  select count(*) into v_count
  from public.review_reports
  where review_id = p_review_id;

  -- 모더레이션 컬럼 갱신을 트리거 가드에 통과시키는 트랜잭션-로컬 플래그.
  perform set_config('app.moderation', 'on', true);
  update public.reviews
    set report_count = v_count,
        is_hidden = (v_count >= 3) -- 임계치: 신고 3회 누적 시 자동 숨김
    where id = p_review_id;
end;
$$;

-- 이 함수는 의도적으로 RPC 로 노출한다(클라이언트가 신고). anon 은 제외하고 로그인 사용자만.
-- 린트 0028/0029: authenticated 실행은 의도된 예외(신고 기능). anon 은 명시적으로 차단한다
-- (함수 내부에서도 auth.uid() null 이면 예외지만, RPC 노출 자체를 막아 이중 방어).
revoke execute on function public.report_review(uuid) from public;
revoke execute on function public.report_review(uuid) from anon;
grant execute on function public.report_review(uuid) to authenticated;

-- ── RLS: reviews ────────────────────────────────────────────────
alter table public.reviews enable row level security;

-- 공개 read: 숨김 제외. 단, 작성자는 자기 후기(숨김 포함)를 볼 수 있다.
drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
  on public.reviews for select
  to anon, authenticated
  using (is_hidden = false or (select auth.uid()) = user_id);

-- 작성: 본인(user_id) + 그 산을 방문완료(visited)한 경우만.
drop policy if exists "reviews_insert_visited" on public.reviews;
create policy "reviews_insert_visited"
  on public.reviews for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.visited v
      where v.user_id = (select auth.uid())
        and v.mountain_id = reviews.mountain_id -- visited 에도 mountain_id 가 있어 반드시 한정
    )
  );

-- 수정: 본인 후기만(모더레이션 컬럼은 트리거가 별도 보호).
drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own"
  on public.reviews for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 삭제: 본인 후기만.
drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
  on public.reviews for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ── RLS: review_reports (잠금 — 직접 접근 차단, 정의자 함수만 기록) ──
alter table public.review_reports enable row level security;
-- 정책을 두지 않아 anon/authenticated 직접 접근은 모두 거부된다.
-- report_review() 가 SECURITY DEFINER 로 RLS 를 우회해 유일하게 기록한다.
