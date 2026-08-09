// 산 마스터 시드 생성기 (Task 014).
// - lib/geo/kma-grid.ts 와 동일한 기상청 DFS 변환식으로 grid_nx/grid_ny 계산(빌드 스크립트라 로직 복제)
// - 결정론적 UUID(v5, DNS 네임스페이스 위 slug)로 재실행 시 id 안정
// - supabase/seed/mountains.sql 출력 + 참조점 단위 검증 로그
// 실행: node supabase/seed/gen-mountains.mjs supabase/seed/mountains.sql
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

// ── 기상청 DFS 격자 변환 (lib/geo/kma-grid.ts 와 동일 알고리즘) ──
const RE = 6371.00877,
  GRID = 5.0,
  SLAT1 = 30.0,
  SLAT2 = 60.0,
  OLON = 126.0,
  OLAT = 38.0,
  XO = 43,
  YO = 136;
const DEGRAD = Math.PI / 180.0;
function latLngToGrid(lat, lng) {
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD,
    slat2 = SLAT2 * DEGRAD,
    olon = OLON * DEGRAD,
    olat = OLAT * DEGRAD;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx, ny };
}

// ── 결정론적 UUID v5 (RFC 4122, SHA-1) ──
const NS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // DNS 네임스페이스
function uuidv5(name) {
  const nsBytes = Buffer.from(NS.replace(/-/g, ""), "hex");
  const hash = createHash("sha1")
    .update(nsBytes)
    .update(Buffer.from("sangil:" + name, "utf8"))
    .digest();
  const b = hash.subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ── 산 마스터 데이터 (slug, 이름, 지역, 고도m, 위도, 경도, 100대명산 여부) ──
// 국립공원(산악형) + 주요 근교/도립산 + 산림청 100대명산(2002, Task 036).
// 좌표는 대표 정상 근사값(격자 5km 해상도). 고도·지역은 위키백과 "대한민국 100대 명산 목록" 기준.
// is_top100: 산림청 선정 100대명산 여부. 서울 남산/북악산/인왕산/수락산/청계산은 100대명산 아님(false).
const MOUNTAINS = [
  // 기존 30종 (Task 014). 25종은 100대명산, 5종(청계산·남산·수락산·북악산·인왕산)은 아님.
  ["bukhansan", "북한산", "서울·경기", 836, 37.6586, 126.9779, true],
  ["dobongsan", "도봉산", "서울·경기", 740, 37.697, 127.0155, true],
  ["gwanaksan", "관악산", "서울·경기", 632, 37.4426, 126.9636, true],
  ["cheonggyesan", "청계산", "서울·경기", 618, 37.403, 127.056, false],
  ["namsan-seoul", "남산", "서울", 262, 37.5512, 126.9882, false],
  ["suraksan", "수락산", "서울·경기", 638, 37.6786, 127.0844, false],
  ["seoraksan", "설악산", "강원", 1708, 38.1194, 128.4655, true],
  ["odaesan", "오대산", "강원", 1565, 37.7947, 128.543, true],
  ["chiaksan", "치악산", "강원", 1288, 37.3717, 128.05, true],
  ["taebaeksan", "태백산", "강원", 1567, 37.0966, 128.9159, true],
  ["jirisan", "지리산", "전남·경남", 1915, 35.3372, 127.7305, true],
  ["deogyusan", "덕유산", "전북·경남", 1614, 35.8603, 127.7472, true],
  ["gyeryongsan", "계룡산", "대전·충남", 845, 36.3417, 127.21, true],
  ["songnisan", "속리산", "충북·경북", 1058, 36.5432, 127.87, true],
  ["sobaeksan", "소백산", "충북·경북", 1439, 36.956, 128.485, true],
  ["woraksan", "월악산", "충북", 1097, 36.8869, 128.105, true],
  ["gayasan", "가야산", "경남·경북", 1433, 35.825, 128.12, true],
  ["juwangsan", "주왕산", "경북", 720, 36.402, 129.155, true],
  ["palgongsan", "팔공산", "대구·경북", 1193, 36.0114, 128.696, true],
  ["naejangsan", "내장산", "전북", 763, 35.487, 126.889, true],
  ["mudeungsan", "무등산", "광주·전남", 1187, 35.1342, 126.9887, true],
  ["wolchulsan", "월출산", "전남", 809, 34.7667, 126.705, true],
  ["hallasan", "한라산", "제주", 1947, 33.3617, 126.5292, true],
  ["geumjeongsan", "금정산", "부산", 802, 35.256, 129.053, true],
  ["daedunsan", "대둔산", "전북·충남", 878, 36.137, 127.305, true],
  ["manisan", "마니산", "인천", 472, 37.611, 126.43, true],
  ["yumyeongsan", "유명산", "경기", 864, 37.568, 127.487, true],
  ["gamaksan", "감악산", "경기", 675, 38.018, 126.976, true],
  ["bukaksan", "북악산", "서울", 342, 37.592, 126.981, false],
  ["inwangsan", "인왕산", "서울", 338, 37.581, 126.958, false],

  // 100대명산 신규 75종 (Task 036). 전부 is_top100=true.
  ["garisan", "가리산", "강원", 1051, 37.8206, 127.9139, true],
  ["gariwangsan", "가리왕산", "강원", 1562, 37.4661, 128.5636, true],
  ["gajisan", "가지산", "울산·경남·경북", 1241, 35.6156, 129.0006, true],
  ["gangcheonsan", "강천산", "전북", 584, 35.4442, 127.1122, true],
  ["gyebangsan", "계방산", "강원", 1577, 37.7261, 128.4569, true],
  ["gongjaksan", "공작산", "강원", 887, 37.7358, 127.9847, true],
  ["gubyeongsan", "구병산", "충북·경북", 876, 36.4658, 127.8339, true],
  ["geumsan", "금산", "경남", 705, 34.7419, 127.9856, true],
  ["geumsusan", "금수산", "충북", 1016, 36.9247, 128.2478, true],
  ["geumosan", "금오산", "경북", 977, 36.1189, 128.3011, true],
  ["gitdaebong", "깃대봉", "전남", 361, 34.6836, 125.4408, true],
  ["namsan-gyeongju", "남산", "경북", 495, 35.7847, 129.2306, true],
  ["naeyeonsan", "내연산", "경북", 711, 36.2439, 129.2894, true],
  ["daeamsan", "대암산", "강원", 1313, 38.2064, 128.1289, true],
  ["daeyasan", "대야산", "경북·충북", 931, 36.6564, 127.9161, true],
  ["deoksungsan", "덕숭산", "충남", 495, 36.6844, 126.6156, true],
  ["deokhangsan", "덕항산", "강원", 1073, 37.24, 129.05, true],
  ["dolaksan", "도락산", "충북", 965, 36.8156, 128.2611, true],
  ["duryunsan", "두륜산", "전남", 700, 34.4736, 126.6208, true],
  ["dutasan", "두타산", "강원", 1357, 37.2378, 129.02, true],
  ["maisan", "마이산", "전북", 687, 35.7625, 127.39, true],
  ["myeongseongsan", "명성산", "강원·경기", 922, 38.06, 127.29, true],
  ["myeongjisan", "명지산", "경기", 1252, 37.9433, 127.35, true],
  ["moaksan", "모악산", "전북", 795, 35.7286, 127.06, true],
  ["muhaksan", "무학산", "경남", 761, 35.2124, 128.55, true],
  ["mireuksan", "미륵산", "경남", 458, 34.8156, 128.43, true],
  ["minjujisan", "민주지산", "충북·전북·경북", 1242, 36.05, 127.87, true],
  ["bangjangsan", "방장산", "전남·전북", 734, 35.44, 126.72, true],
  ["bangtaesan", "방태산", "강원", 1446, 37.93, 128.41, true],
  ["baekdeoksan", "백덕산", "강원", 1350, 37.36, 128.34, true],
  ["baegamsan", "백암산", "전북·전남", 741, 35.45, 126.92, true],
  ["baegunsan-jn", "백운산", "전남", 1222, 35.11, 127.62, true],
  ["baegunsan-gw", "백운산", "강원", 884, 37.28, 128.62, true],
  ["baegunsan-gg", "백운산", "경기·강원", 903, 37.95, 127.53, true],
  ["byeonsan", "변산", "전북", 459, 35.63, 126.55, true],
  ["bislsan", "비슬산", "대구·경북", 1083, 35.71, 128.53, true],
  ["samaksan", "삼악산", "강원", 656, 37.85, 127.63, true],
  ["seodaesan", "서대산", "충남·충북", 904, 36.23, 127.53, true],
  ["seonunsan", "선운산", "전북", 335, 35.5, 126.58, true],
  ["seonginbong", "성인봉", "경북", 987, 37.5, 130.86, true],
  ["soyosan", "소요산", "경기", 588, 37.95, 127.08, true],
  ["sinbulsan", "신불산", "울산", 1159, 35.56, 129.05, true],
  ["yeonhwasan", "연화산", "경남", 524, 35.16, 128.28, true],
  ["obongsan", "오봉산", "강원", 778, 37.95, 127.77, true],
  ["yongmunsan", "용문산", "경기", 1157, 37.56, 127.55, true],
  ["yonghwasan", "용화산", "강원", 878, 38.03, 127.72, true],
  ["unmunsan", "운문산", "경북·경남", 1195, 35.66, 128.94, true],
  ["unaksan", "운악산", "경기", 935, 37.92, 127.35, true],
  ["unjangsan", "운장산", "전북", 1126, 35.92, 127.35, true],
  ["eungbongsan", "응봉산", "강원·경북", 1000, 37.05, 129.31, true],
  ["jangansan", "장안산", "전북", 1237, 35.63, 127.62, true],
  ["jaeyaksan", "재약산", "경남·울산", 1119, 35.55, 128.96, true],
  ["jeoksangsan", "적상산", "전북", 1031, 35.92, 127.72, true],
  ["jeombongsan", "점봉산", "강원", 1426, 38.05, 128.42, true],
  ["jogyesan", "조계산", "전남", 887, 34.99, 127.32, true],
  ["juheulsan", "주흘산", "경북", 1108, 36.78, 128.1, true],
  ["jirisan-tongyeong", "지리산", "경남", 399, 34.83, 128.23, true],
  ["cheongwansan", "천관산", "전남", 724, 34.53, 126.92, true],
  ["cheonmasan", "천마산", "경기", 810, 37.69, 127.24, true],
  ["cheonseongsan", "천성산", "경남", 920, 35.43, 129.09, true],
  ["cheontaesan", "천태산", "충북·충남", 715, 36.21, 127.72, true],
  ["cheongnyangsan", "청량산", "경북", 870, 36.79, 128.91, true],
  ["chuwolsan", "추월산", "전남·전북", 731, 35.42, 126.99, true],
  ["chungnyeongsan", "축령산", "경기", 887, 37.75, 127.32, true],
  ["chilgapsan", "칠갑산", "충남", 560, 36.41, 126.86, true],
  ["taehwasan", "태화산", "강원·충북", 1028, 37.11, 128.44, true],
  ["palbongsan", "팔봉산", "강원", 328, 37.71, 127.73, true],
  ["palyeongsan", "팔영산", "전남", 607, 34.63, 127.42, true],
  ["hwaaksan", "화악산", "경기·강원", 1468, 38.04, 127.5, true],
  ["hwawangsan", "화왕산", "경남", 758, 35.52, 128.53, true],
  ["hwangmaesan", "황매산", "경남", 1113, 35.49, 127.93, true],
  ["hwangseoksan", "황석산", "경남", 1193, 35.66, 127.76, true],
  ["hwangaksan", "황악산", "경북", 1111, 36.13, 127.99, true],
  ["hwangjangsan", "황장산", "경북", 1079, 36.79, 128.33, true],
  ["huiyangsan", "희양산", "경북·충북", 996, 36.75, 128.03, true],
];

// 격자 → 위경도 역변환 (roundtrip 자기일관성 검증용, 격자 셀 중심 좌표 반환)
function gridToLatLng(nx, ny) {
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD,
    slat2 = SLAT2 * DEGRAD,
    olon = OLON * DEGRAD,
    olat = OLAT * DEGRAD;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);
  const xn = nx - XO;
  const yn = ro - (ny - YO);
  let ra = Math.sqrt(xn * xn + yn * yn);
  if (sn < 0) ra = -ra;
  let alat = Math.pow((re * sf) / ra, 1.0 / sn);
  alat = 2.0 * Math.atan(alat) - Math.PI * 0.5;
  let theta;
  if (Math.abs(xn) <= 0) theta = 0.0;
  else if (Math.abs(yn) <= 0) theta = Math.PI * 0.5 * (xn < 0 ? -1 : 1);
  else theta = Math.atan2(xn, yn);
  const alon = theta / sn + olon;
  return { lat: alat / DEGRAD, lng: alon / DEGRAD };
}

// ── 단위 검증 ──
// 1) 기상청 공식 문서 예시 좌표 → 격자 (셀 내부 지점이라 경계 민감성 없음)
const CHECKS = [
  ["서울 종로구(공식예시)", 37.5665, 126.978, 60, 127],
  ["제주 제주시(공식예시)", 33.4996, 126.5312, 53, 38],
];
let ok = true;
console.log("== 격자 변환 단위 검증 ==");
for (const [n, la, ln, ex, ey] of CHECKS) {
  const { nx, ny } = latLngToGrid(la, ln);
  const pass = nx === ex && ny === ey;
  if (!pass) ok = false;
  console.log(`${pass ? "PASS" : "FAIL"} ${n}: got (${nx},${ny}) expected (${ex},${ey})`);
}
// 2) roundtrip 자기일관성: 시드 전 좌표 → 격자 → 셀중심 → 격자 가 동일 격자로 수렴
let rtFail = 0;
for (const [, , , , lat, lng] of MOUNTAINS) {
  const g = latLngToGrid(lat, lng);
  const c = gridToLatLng(g.nx, g.ny);
  const g2 = latLngToGrid(c.lat, c.lng);
  if (g.nx !== g2.nx || g.ny !== g2.ny) rtFail++;
}
if (rtFail > 0) ok = false;
console.log(`roundtrip 자기일관성: ${MOUNTAINS.length - rtFail}/${MOUNTAINS.length} 격자 안정`);
console.log(ok ? "→ 단위 검증 통과\n" : "→ 검증 실패!\n");

// ── SQL 생성 ──
const rows = MOUNTAINS.map(([slug, name, region, alt, lat, lng, isTop100]) => {
  const { nx, ny } = latLngToGrid(lat, lng);
  const id = uuidv5(slug);
  const altSql = alt == null ? "null" : String(alt);
  console.log(
    `${name.padEnd(6)} (${lat},${lng}) → grid (${nx},${ny})  top100=${isTop100 ? "Y" : "n"}  id=${id}`,
  );
  return `  ('${id}', '${name}', '${region}', ${altSql}, ${lat}, ${lng}, ${nx}, ${ny}, ${isTop100 ? "true" : "false"})`;
});

const top100Count = MOUNTAINS.filter((m) => m[6]).length;

const sql = `-- 산 마스터 시드 데이터 (Task 014 → Task 036: 100대명산 확장).
-- supabase/seed/gen-mountains.mjs 로 생성. lib/geo/kma-grid.ts 로 grid_nx/ny 사전 계산.
-- id 는 결정론적 UUID v5(slug 기반)라 재실행해도 안정적이며, on conflict 로 멱등 적재한다.
-- is_top100: 산림청 선정 100대명산 여부(결정 001 참조). 총 ${MOUNTAINS.length}종 중 100대명산 ${top100Count}종.
-- 재생성: node supabase/seed/gen-mountains.mjs supabase/seed/mountains.sql

insert into public.mountains (id, name, region, altitude, lat, lng, grid_nx, grid_ny, is_top100)
values
${rows.join(",\n")}
on conflict (id) do update set
  name = excluded.name,
  region = excluded.region,
  altitude = excluded.altitude,
  lat = excluded.lat,
  lng = excluded.lng,
  grid_nx = excluded.grid_nx,
  grid_ny = excluded.grid_ny,
  is_top100 = excluded.is_top100;
`;

const out = process.argv[2];
if (out) {
  writeFileSync(out, sql);
  console.log(`\n→ ${out} 작성 (${MOUNTAINS.length}개 산)`);
} else {
  console.log("\n" + sql);
}
