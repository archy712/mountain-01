-- 편의시설: 대피소 수용인원 컬럼 추가 (Task 045 확장 — 대피소).
-- 화장실엔 해당 없어 nullable. 대피소(type='shelter') 시드에서 채운다.

alter table public.facilities
  add column if not exists capacity int; -- 수용 인원(대피소). 화장실은 null
