-- 편의시설(대피소) 시드 데이터 (Task 045 확장).
-- supabase/seed/gen-shelters.ts 로 국립공원공단 대피소 CSV(로컬·CP949) 에서 생성.
-- 사무소코드 → 산 매핑(지리산 101·102·103, 도봉산 1502), 이용가능·매핑 성공만 적재.
-- id 는 shelter- 접두 네임스페이스라 화장실과 충돌하지 않는다. 재실행 멱등. 재생성:
--   npx tsx supabase/seed/gen-shelters.ts supabase/seed/shelters.sql

create extension if not exists "uuid-ossp";

insert into public.facilities
  (id, mountain_id, type, name, lat, lng, capacity, address, elevation)
select
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'sangil:facility:' || v.ext_id),
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'sangil:' || v.slug),
  'shelter',
  v.name, v.lat::double precision, v.lng::double precision,
  v.capacity::int, v.address, v.elevation::int
from (values
  ('shelter-1', 'seoraksan', '중청대피소', 38.121099, 128.4603949, 120, '강원도 양양군 서면 오색리 산1-24', 1596),
  ('shelter-2', 'seoraksan', '수렴동대피소', 38.146411, 128.4141587, 18, '강원도 인제군 북면 용대리 산12-1', 574),
  ('shelter-3', 'seoraksan', '소청대피소', 38.126612, 128.4531738, 70, '강원도 인제군 북면 용대리 산12-1', 1450),
  ('shelter-4', 'seoraksan', '희운각대피소', 38.1326918, 128.4649575, 35, '강원도 인제군 북면 용대리 산12-1', 1065),
  ('shelter-5', 'seoraksan', '양폭대피소', 38.1400263, 128.4739011, 30, '강원도 속초시 설악동 산41', 687),
  ('shelter-6', 'hallasan', '윗세대피소(2)', 33.3618801, 126.5175722, 100, '제주 제주시 애월읍 광령리 산 183-6', 1694),
  ('shelter-7', 'hallasan', '윗세대피소(1)', 33.3620078, 126.5176471, 60, '제주 제주시 애월읍 광령리 산 183-6', 1694),
  ('shelter-8', 'hallasan', '속밭대피소', 33.3801692, 126.581201, 25, '제주 제주시 조천읍 교래리 산 137-2', 1117),
  ('shelter-9', 'hallasan', '진달래밭대피소', 33.3698376, 126.5555104, 100, '제주 서귀포시 남원읍 하예리 산 1', 1519),
  ('shelter-10', 'hallasan', '삼각봉대피소', 33.3767072, 126.5307022, 80, '제주 제주시 오라동 산 107-20', 1526),
  ('shelter-11', 'hallasan', '탐라대피소', 33.4001493, 126.5397697, 40, '제주 제주시 오라동 산 107', 917),
  ('shelter-12', 'hallasan', '평궤대피소', 33.3487275, 126.545123, 60, '제주 서귀포시 토평동 산 1', 1483),
  ('shelter-13', 'jirisan', '노고단대피소', 35.295971, 127.5263052, 108, '전라남도 구례군 산동면 좌사리 산110-2', 1342),
  ('shelter-14', 'jirisan', '연하천대피소', 35.3312888, 127.6131223, 70, '전라북도 남원시 산내면 부운리 산120-5', 1498),
  ('shelter-15', 'jirisan', '장터목대피소', 35.3324016, 127.7162686, 135, '경상남도 함양군 마천면 강청리 산100', 1656),
  ('shelter-16', 'jirisan', '치밭목대피소', 35.3485805, 127.7505193, 40, '경상남도 산청군 삼장면 유평리 산51', 1784),
  ('shelter-17', 'jirisan', '세석대피소', 35.3181129, 127.6934436, 190, '경상남도 산청군 시천면 내대리 산325', 1563),
  ('shelter-18', 'jirisan', '피아골대피소', 35.2860309, 127.5559869, 50, '전라남도 구례군 토지면 내동리 368', 799),
  ('shelter-19', 'jirisan', '벽소령대피소', 35.3260399, 127.6428096, 120, '경상남도 함양군 마천면 삼정리 산161', 1323),
  ('shelter-20', 'jirisan', '로타리대피소', 35.3272409, 127.7373653, 35, '경상남도 산청군 시천면 중산리 산208', 1339),
  ('shelter-21', 'odaesan', '노인봉대피소', 37.7808591, 128.6401229, 50, '강원 강릉시 연곡면 삼산리 산 1-12', 1325),
  ('shelter-22', 'dobongsan', '도봉대피소', 37.6937261, 127.0225538, 7, '서울특별시 도봉구 도봉동 산31', 258),
  ('shelter-23', 'bukhansan', '북한대피소', 37.6493139, 126.9823051, 30, '경기도 고양시 북한동 산1-1', 574),
  ('shelter-24', 'bukhansan', '백운대피소', 37.6584998, 126.9811215, 50, '경기도 고양시 덕양구 효자동 산1-1', 645),
  ('shelter-25', 'bukhansan', '북한산인수대피소', 37.6612482, 126.9851452, 0, '경기도 고양시 덕양구 효자동', 473),
  ('shelter-26', 'deogyusan', '향적봉대피소', 35.8587751, 127.7468363, 60, '전라북도 무주군 설천면 삼공리 산109', 1581),
  ('shelter-27', 'deogyusan', '삿갓골재대피소', 35.7911157, 127.7049397, 45, '경상남도 거창군 북상면 월성리 산282-3', 1222)
) as v(ext_id, slug, name, lat, lng, capacity, address, elevation)
on conflict (id) do update set
  mountain_id = excluded.mountain_id,
  type = excluded.type,
  name = excluded.name,
  lat = excluded.lat,
  lng = excluded.lng,
  capacity = excluded.capacity,
  address = excluded.address,
  elevation = excluded.elevation;
