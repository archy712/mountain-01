-- 산길날씨 코어 도메인 스키마.
-- Task 006 도메인 타입 및 결정 003 캐시/점수 설계와 정합한다.
-- 멱등하게 작성되어 재적용해도 안전하다. (적용은 Task 014)
-- RLS 정책은 별도 마이그레이션(_sangil_rls.sql)에서 활성화한다.

-- 부분일치/초성 검색용 트라이그램 확장 (Supabase 권장: extensions 스키마에 설치)
create extension if not exists pg_trgm with schema extensions;

-- ── mountains: 산 마스터 ──────────────────────────────────────────
create table if not exists public.mountains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null, -- 행정 지역(동명 산 구분용)
  altitude integer, -- 고도(m), 미상이면 null
  lat double precision not null,
  lng double precision not null,
  grid_nx integer not null, -- 기상청 격자 X (시드 시 사전 적재, 결정 002 #7)
  grid_ny integer not null, -- 기상청 격자 Y
  created_at timestamptz not null default now()
);

comment on table public.mountains is '산 마스터 데이터 (공개 읽기)';

-- 이름 부분일치/초성 검색 인덱스 (Task 018)
create index if not exists mountains_name_trgm_idx
  on public.mountains using gin (name extensions.gin_trgm_ops);

-- ── trails: 탐방로 ────────────────────────────────────────────────
create table if not exists public.trails (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references public.mountains (id) on delete cascade,
  name text not null,
  status text not null default 'unknown'
    check (status in ('open', 'closed', 'partial', 'unknown')), -- TrailStatus
  closed_reason text, -- 통제 사유
  closed_period text, -- 통제 기간 원문(계절 통제)
  path_geojson jsonb, -- 등산로 GeoJSON (3단계 Task 029, nullable)
  created_at timestamptz not null default now()
);

comment on table public.trails is '탐방로 개방 상태·등산로 (공개 읽기)';

create index if not exists trails_mountain_id_idx on public.trails (mountain_id);

-- ── favorites: 즐겨찾기 (2단계) ───────────────────────────────────
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mountain_id uuid not null references public.mountains (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, mountain_id) -- 중복 즐겨찾기 방지
);

comment on table public.favorites is '사용자 즐겨찾기 (본인 행만 접근)';

create index if not exists favorites_user_id_idx on public.favorites (user_id);
-- (user_id, mountain_id) 유니크는 mountain_id 단독 FK 를 커버하지 않아 별도 인덱스
create index if not exists favorites_mountain_id_idx on public.favorites (mountain_id);

-- ── condition_scores: 컨디션 점수 캐시 (2단계) ────────────────────
create table if not exists public.condition_scores (
  id uuid primary key default gen_random_uuid(),
  mountain_id uuid not null references public.mountains (id) on delete cascade,
  score integer not null check (score between 0 and 100),
  grade text not null
    check (grade in ('excellent', 'good', 'fair', 'poor', 'dangerous')), -- ScoreGrade
  breakdown jsonb not null default '[]'::jsonb, -- 감점 근거 배열
  calc_version text not null, -- 알고리즘 버전 (결정 003 #10)
  computed_at timestamptz not null default now()
);

comment on table public.condition_scores is '컨디션 점수 계산 캐시 (공개 읽기, 서버 롤 쓰기)';

-- 최신 점수 조회: (산, 버전) 별 computed_at 내림차순
create index if not exists condition_scores_lookup_idx
  on public.condition_scores (mountain_id, calc_version, computed_at desc);

-- ── search_logs: 익명 검색 로깅 (결정 002 #14) ────────────────────
create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  mountain_id uuid references public.mountains (id) on delete set null, -- 매칭 산(nullable)
  created_at timestamptz not null default now()
);

comment on table public.search_logs is '익명 검색 로깅 (insert-only, 개인정보 미수집)';

create index if not exists search_logs_mountain_id_idx on public.search_logs (mountain_id);
