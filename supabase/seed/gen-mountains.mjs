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

// ── 산 마스터 데이터 (slug, 이름, 지역, 고도m, 위도, 경도) ──
// 국립공원(산악형) + 주요 근교/도립산. 좌표는 대표 정상 근사값(격자 5km 해상도).
const MOUNTAINS = [
  ["bukhansan", "북한산", "서울·경기", 836, 37.6586, 126.9779],
  ["dobongsan", "도봉산", "서울·경기", 740, 37.697, 127.0155],
  ["gwanaksan", "관악산", "서울·경기", 632, 37.4426, 126.9636],
  ["cheonggyesan", "청계산", "서울·경기", 618, 37.403, 127.056],
  ["namsan-seoul", "남산", "서울", 262, 37.5512, 126.9882],
  ["suraksan", "수락산", "서울·경기", 638, 37.6786, 127.0844],
  ["seoraksan", "설악산", "강원", 1708, 38.1194, 128.4655],
  ["odaesan", "오대산", "강원", 1565, 37.7947, 128.543],
  ["chiaksan", "치악산", "강원", 1288, 37.3717, 128.05],
  ["taebaeksan", "태백산", "강원", 1567, 37.0966, 128.9159],
  ["jirisan", "지리산", "전남·경남", 1915, 35.3372, 127.7305],
  ["deogyusan", "덕유산", "전북·경남", 1614, 35.8603, 127.7472],
  ["gyeryongsan", "계룡산", "대전·충남", 845, 36.3417, 127.21],
  ["songnisan", "속리산", "충북·경북", 1058, 36.5432, 127.87],
  ["sobaeksan", "소백산", "충북·경북", 1439, 36.956, 128.485],
  ["woraksan", "월악산", "충북", 1097, 36.8869, 128.105],
  ["gayasan", "가야산", "경남·경북", 1433, 35.825, 128.12],
  ["juwangsan", "주왕산", "경북", 720, 36.402, 129.155],
  ["palgongsan", "팔공산", "대구·경북", 1193, 36.0114, 128.696],
  ["naejangsan", "내장산", "전북", 763, 35.487, 126.889],
  ["mudeungsan", "무등산", "광주·전남", 1187, 35.1342, 126.9887],
  ["wolchulsan", "월출산", "전남", 809, 34.7667, 126.705],
  ["hallasan", "한라산", "제주", 1947, 33.3617, 126.5292],
  ["geumjeongsan", "금정산", "부산", 802, 35.256, 129.053],
  ["daedunsan", "대둔산", "전북·충남", 878, 36.137, 127.305],
  ["manisan", "마니산", "인천", 472, 37.611, 126.43],
  ["yumyeongsan", "유명산", "경기", 864, 37.568, 127.487],
  ["gamaksan", "감악산", "경기", 675, 38.018, 126.976],
  ["bukaksan", "북악산", "서울", 342, 37.592, 126.981],
  ["inwangsan", "인왕산", "서울", 338, 37.581, 126.958],
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
const rows = MOUNTAINS.map(([slug, name, region, alt, lat, lng]) => {
  const { nx, ny } = latLngToGrid(lat, lng);
  const id = uuidv5(slug);
  const altSql = alt == null ? "null" : String(alt);
  console.log(`${name.padEnd(6)} (${lat},${lng}) → grid (${nx},${ny})  id=${id}`);
  return `  ('${id}', '${name}', '${region}', ${altSql}, ${lat}, ${lng}, ${nx}, ${ny})`;
});

const sql = `-- 산 마스터 시드 데이터 (Task 014).
-- scratchpad/gen-mountains-seed.mjs 로 생성. lib/geo/kma-grid.ts 로 grid_nx/ny 사전 계산.
-- id 는 결정론적 UUID v5(slug 기반)라 재실행해도 안정적이며, on conflict 로 멱등 적재한다.
-- 재생성: node scratchpad/gen-mountains-seed.mjs

insert into public.mountains (id, name, region, altitude, lat, lng, grid_nx, grid_ny)
values
${rows.join(",\n")}
on conflict (id) do update set
  name = excluded.name,
  region = excluded.region,
  altitude = excluded.altitude,
  lat = excluded.lat,
  lng = excluded.lng,
  grid_nx = excluded.grid_nx,
  grid_ny = excluded.grid_ny;
`;

const out = process.argv[2];
if (out) {
  writeFileSync(out, sql);
  console.log(`\n→ ${out} 작성 (${MOUNTAINS.length}개 산)`);
} else {
  console.log("\n" + sql);
}
