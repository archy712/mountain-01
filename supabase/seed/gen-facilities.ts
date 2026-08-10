/**
 * 편의시설(화장실) 시드 생성기 (Task 045).
 * 실행: npx tsx supabase/seed/gen-facilities.ts supabase/seed/facilities.sql
 *
 * GSTN_TOILET_PT.csv(국립공원공단 화장실 포인트, 로컬·CP949) → 사무소코드로 산 매핑 →
 * facilities INSERT SQL 생성. 사무소코드 체계가 mountain.csv(탐방로)와 동일해
 * `OFFICE_TO_MOUNTAIN_SLUG` 를 재사용한다. 북한산 사무소(1501)는 코스명이 없어 **주소**로
 * 북한산/도봉산을 분리한다(도봉구·의정부·양주 → 도봉산). 사용여부(USE_YN)=0·미매핑 사무소는 제외.
 *
 * id 는 국립공원관리번호(ID_CD) 기반 결정론적 UUID v5 라 재실행 멱등(on conflict).
 * mountain_id = uuidv5('sangil:'||slug) 로 gen-mountains 의 산 id 와 일치한다.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { splitCsvLine } from "../../lib/trails/parse-knps-csv";
import { resolveFacilityMountainSlug } from "./facility-mapping";

// 결정론적 UUID v5 네임스페이스(gen-mountains.mjs·gen-trails.ts 와 동일). id/mountain_id 는
// SQL 의 uuid_generate_v5 로 계산하므로(재실행 멱등) JS 측 계산은 두지 않는다.
const NS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function sqlStr(v: string | null): string {
  if (v === null) return "null";
  return `'${v.replace(/'/g, "''")}'`;
}
function sqlNum(v: number | null): string {
  return v === null ? "null" : String(v);
}
function parseIntOrNull(v: string | undefined): number | null {
  if (v == null) return null;
  const s = v.trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : Number.isFinite(n) ? Math.round(n) : null;
}
function parseFloatOrNull(v: string | undefined): number | null {
  if (v == null) return null;
  const s = v.trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// 주의: `국립공원관리번호(ID_CD)` 는 원본 CSV 가 Excel 지수표기(예: 1.50102E+11)로 손상돼
// 사무소 내 전 행이 동일 값이라 키로 쓸 수 없다. `SEQNO` 도 사무소 내에서 하위그룹별로 재시작해
// 고유하지 않다. 그래서 전역 고유한 `OBJECTID`(1~600)를 안정 키로 쓴다.
const COLUMNS = {
  objectId: "관리번호(OBJECTID)",
  office: "공원사무소코드(PO_CD)",
  name: "명칭_한글(KOR_NM)",
  address: "주소_지번(LNM_ADRES)",
  accessible: "장애인화장실유무(DSPSN_TOIL)",
  useYn: "사용여부(USE_YN)",
  elevation: "고도(ELEVATION)",
  lng: "경도(LONGITUDE)",
  lat: "위도(LATITUDE)",
} as const;

const OUT = process.argv[2];
const CSV_PATH = process.argv[3] ?? "GSTN_TOILET_PT.csv";

const text = new TextDecoder("euc-kr").decode(readFileSync(CSV_PATH));
const lines = text.split(/\r?\n/);
const header = splitCsvLine(lines[0]);
const idx = (name: string) => header.indexOf(name);

const iObj = idx(COLUMNS.objectId);
const iOffice = idx(COLUMNS.office);
const iName = idx(COLUMNS.name);
const iAddr = idx(COLUMNS.address);
const iAcc = idx(COLUMNS.accessible);
const iUse = idx(COLUMNS.useYn);
const iElev = idx(COLUMNS.elevation);
const iLng = idx(COLUMNS.lng);
const iLat = idx(COLUMNS.lat);

if ([iObj, iOffice, iName, iUse, iLng, iLat].some((i) => i < 0)) {
  throw new Error("GSTN_TOILET_PT.csv 헤더에서 필요한 열을 찾지 못했습니다. 포맷을 확인하세요.");
}

interface FacilityRow {
  extId: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  accessible: boolean;
  address: string | null;
  elevation: number | null;
}

const byExt = new Map<string, FacilityRow>();
const perMountain = new Map<string, number>();
const unmappedOffice = new Map<string, number>();
let skippedUnused = 0;
let skippedNoCoord = 0;
let skippedNoName = 0;

for (let li = 1; li < lines.length; li++) {
  const line = lines[li];
  if (!line) continue;
  const f = splitCsvLine(line);
  if (f.length < header.length) continue;

  // 사용중(USE_YN=1)만 적재.
  if ((f[iUse] ?? "").trim() !== "1") {
    skippedUnused++;
    continue;
  }
  const name = (f[iName] ?? "").trim();
  if (name === "") {
    skippedNoName++;
    continue;
  }
  const lat = parseFloatOrNull(f[iLat]);
  const lng = parseFloatOrNull(f[iLng]);
  if (lat === null || lng === null) {
    skippedNoCoord++;
    continue;
  }
  const office = (f[iOffice] ?? "").trim();
  const address = iAddr >= 0 ? (f[iAddr] ?? "").trim() : "";
  const slug = resolveFacilityMountainSlug(office, name, address);
  if (!slug) {
    unmappedOffice.set(office, (unmappedOffice.get(office) ?? 0) + 1);
    continue;
  }

  // 안정 키: OBJECTID(전역 고유, 1~600). SEQNO 는 사무소 내에서 하위그룹별로 재시작해
  // (예: 계룡산 1~6 이 2회씩) 고유하지 않으므로 쓰지 않는다.
  const extId = (f[iObj] ?? "").trim();
  byExt.set(extId, {
    extId,
    slug,
    name,
    lat,
    lng,
    accessible: iAcc >= 0 && (f[iAcc] ?? "").trim() === "1",
    address: address || null,
    elevation: iElev >= 0 ? parseIntOrNull(f[iElev]) : null,
  });
}

const rows: string[] = [];
for (const r of byExt.values()) {
  perMountain.set(r.slug, (perMountain.get(r.slug) ?? 0) + 1);
  rows.push(
    `  (${sqlStr(r.extId)}, '${r.slug}', ${sqlStr(r.name)}, ${r.lat}, ${r.lng}, ` +
      `${r.accessible ? "true" : "false"}, ${sqlStr(r.address)}, ${sqlNum(r.elevation)})`,
  );
}

console.log(`총 화장실(사용중·매핑): ${rows.length}`);
console.log("\n== 산별 적재 화장실 수 ==");
for (const [slug, n] of [...perMountain.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${slug.padEnd(14)} ${n}`);
}
console.log("\n== 미매핑 사무소(산악형 아님·시드 미포함) → 제외 ==");
for (const [office, n] of [...unmappedOffice.entries()].sort()) {
  console.log(`  office ${office}: ${n}개`);
}
console.log(
  `\n스킵 — 미사용(USE_YN=0): ${skippedUnused}, 좌표 결측: ${skippedNoCoord}, 이름 없음: ${skippedNoName}`,
);

const NS_SQL = NS;
const sql = `-- 편의시설(화장실) 시드 데이터 (Task 045).
-- supabase/seed/gen-facilities.ts 로 국립공원공단 GSTN_TOILET_PT.csv(로컬·CP949) 에서 생성.
-- 사무소코드 → 산 매핑(북한산 1501 은 주소로 북한산/도봉산 분리), USE_YN=1·매핑 성공만 적재.
-- id/mountain_id 는 uuid_generate_v5 로 계산(재실행 멱등). 재생성:
--   npx tsx supabase/seed/gen-facilities.ts supabase/seed/facilities.sql

create extension if not exists "uuid-ossp";

insert into public.facilities
  (id, mountain_id, type, name, lat, lng, accessible, address, elevation)
select
  uuid_generate_v5('${NS_SQL}', 'sangil:facility:' || v.ext_id),
  uuid_generate_v5('${NS_SQL}', 'sangil:' || v.slug),
  'toilet',
  v.name, v.lat::double precision, v.lng::double precision,
  v.accessible::boolean, v.address, v.elevation::int
from (values
${rows.join(",\n")}
) as v(ext_id, slug, name, lat, lng, accessible, address, elevation)
on conflict (id) do update set
  mountain_id = excluded.mountain_id,
  type = excluded.type,
  name = excluded.name,
  lat = excluded.lat,
  lng = excluded.lng,
  accessible = excluded.accessible,
  address = excluded.address,
  elevation = excluded.elevation;
`;

if (OUT) {
  writeFileSync(OUT, sql);
  console.log(`\n→ ${OUT} 작성 (${rows.length} facilities)`);
} else {
  console.log("\n" + sql.slice(0, 500));
}
