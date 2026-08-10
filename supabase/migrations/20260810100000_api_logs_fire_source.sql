-- Task 043: 산불위험예보(forest fire) 소스를 api_logs 계측 대상에 추가한다.
-- withStaleFallback 이 캐시 키 접두사 "fire:" 로 소스를 파생해 fire-and-forget insert 하므로,
-- source CHECK 제약에 'fire' 를 허용해야 적재가 성공한다(기존 5종 + fire).
alter table public.api_logs drop constraint if exists api_logs_source_check;
alter table public.api_logs
  add constraint api_logs_source_check
  check (source in ('weather', 'vilage', 'air', 'uv', 'trails', 'fire'));
