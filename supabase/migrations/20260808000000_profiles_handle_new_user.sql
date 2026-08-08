-- 신규 auth.users 생성 시 public.profiles 행을 자동 생성하는 트리거.
-- 이메일 가입과 Google(OAuth) 가입 모두를 커버한다.
-- 멱등(idempotent)하게 작성되어 여러 번 실행해도 안전하다.

-- 1) 트리거 함수
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    -- 이메일 가입은 메타데이터가 비어 있을 수 있고,
    -- OAuth(Google)는 full_name/name, avatar_url/picture 로 들어온다.
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

-- 2) 트리거 (재적용 안전하도록 먼저 drop)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 3) 이미 가입되어 있는데 profiles 행이 없는 기존 사용자 백필
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
