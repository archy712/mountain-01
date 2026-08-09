-- 산 마스터에 100대명산 여부 플래그 추가 (Task 036).
-- 산림청 100대명산 부분집합을 단순 필터(where is_top100)로 조회하기 위한 컬럼.
alter table public.mountains
  add column if not exists is_top100 boolean not null default false;

comment on column public.mountains.is_top100 is '산림청 100대명산 여부 (Task 036)';

-- /top100 목록·필터 조회용 부분 인덱스 (is_top100=true 행만 색인)
create index if not exists mountains_is_top100_idx
  on public.mountains (is_top100)
  where is_top100;
