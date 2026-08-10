-- Task 052: 대기질 예보통보(dust) 소스를 api_logs 계측 대상에 추가한다.
-- withStaleFallback 이 캐시 키 접두사 "dust:" 로 소스를 파생해 fire-and-forget insert 하므로,
-- source CHECK 제약에 'dust' 를 허용해야 적재가 성공한다(기존 6종 + dust).
alter table public.api_logs drop constraint if exists api_logs_source_check;
alter table public.api_logs
  add constraint api_logs_source_check
  check (source in ('weather', 'vilage', 'air', 'dust', 'uv', 'trails', 'fire'));
