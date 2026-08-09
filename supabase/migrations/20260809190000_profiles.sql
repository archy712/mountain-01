-- 프로필 테이블 (마이페이지 프로필 편집). 스타터의 profiles 마이그레이션이 이 프로젝트에
-- 적용된 적이 없어(원격에 테이블·트리거 부재) 여기서 **전체를 새로 정의**한다.
-- 요약:
--   profiles : 본인(auth.uid()=id) select/insert/update. 공개 프로필 없음(본인만 조회).
--   신규 사용자 가입 시 트리거로 행 자동 생성, 기존 사용자 백필.
-- 확장 속성: avatar_icon(프리셋 아이콘), bio(자기소개), favorite_mountain_id(가장 좋아하는 산),
--            home_region(주 활동 지역), experience_level(등산 경력).
-- favorite_mountain_id 는 mountains(20260808120000)를 참조하므로 그 이후 순서로 둔다.

-- ── profiles ──────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text unique, -- 닉네임/핸들(선택, 중복 불가)
  full_name text, -- 이름
  avatar_url text, -- OAuth 프로필 사진 URL(보존용; 표시엔 avatar_icon 우선)
  avatar_icon text, -- 프리셋 프로필 아이콘(이모지). 없으면 이니셜 폴백
  bio text, -- 자기소개
  favorite_mountain_id uuid references public.mountains (id) on delete set null, -- 가장 좋아하는 산
  home_region text, -- 주 활동 지역
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')), -- 등산 경력
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is '사용자 프로필 (본인만 조회·수정)';

create index if not exists profiles_favorite_mountain_id_idx
  on public.profiles (favorite_mountain_id);

-- ── updated_at 자동 갱신 트리거 ───────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 트리거 전용 함수라 REST RPC 로 노출될 필요가 없다(보안 린트 0028/0029 대응).
-- 기본 PUBLIC 실행권한을 회수한다(anon/authenticated 는 PUBLIC 을 상속하므로 함께 차단됨).
revoke execute on function public.set_updated_at() from public;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── RLS: 본인 행만 select/insert/update ──────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ── 신규 가입 시 프로필 자동 생성 트리거 ─────────────────────
-- 이메일 가입은 메타데이터가 비어 있을 수 있고, OAuth(Google)는 full_name/name,
-- avatar_url/picture 로 들어온다. avatar_icon 은 우리 프리셋이라 여기서 채우지 않는다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 트리거 전용 함수라 REST RPC 로 노출될 필요가 없다(보안 린트 0028/0029 대응).
revoke execute on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 기존 사용자 백필(profiles 행 없는 경우) ──────────────────
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  ),
  coalesce(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
