-- 편의시설(화장실) 테이블 (Task 045).
-- 국립공원공단 화장실 포인트(GSTN_TOILET_PT.csv)를 정적 시드로 적재한다.
-- mountains/trails 관례를 따른다: 공개 select + 쓰기 차단(서비스 롤만), mountain_id FK·인덱스.
-- type 은 확장 대비(대피소·식수대·매점) 필드이며 1차 범위는 'toilet' 뿐이다.

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references public.mountains (id) on delete cascade,
  type text not null default 'toilet'
    check (type in ('toilet', 'shelter', 'spring', 'shop')), -- FacilityType (확장 대비)
  name text not null,
  lat double precision not null,
  lng double precision not null,
  accessible boolean not null default false, -- 장애인화장실 유무
  address text, -- 지번 주소(표시·검증용)
  elevation int, -- 고도(m, nullable)
  created_at timestamptz not null default now()
);

create index if not exists facilities_mountain_id_idx on public.facilities (mountain_id);

-- ── facilities: 공개 읽기 전용(쓰기는 서비스 롤만 = RLS 우회) ──
alter table public.facilities enable row level security;

drop policy if exists "facilities_public_select" on public.facilities;
create policy "facilities_public_select"
  on public.facilities for select
  to anon, authenticated
  using (true);
