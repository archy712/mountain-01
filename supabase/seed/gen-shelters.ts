/**
 * 편의시설(대피소) 시드 생성기 (Task 045 확장). 실행:
 *   npx tsx supabase/seed/gen-shelters.ts supabase/seed/shelters.sql
 *
 * 국립공원공단 대피소 CSV(로컬·CP949) → 사무소코드로 산 매핑 → facilities INSERT(type='shelter').
 * 화장실(gen-facilities.ts)과 같은 테이블·패턴을 쓰되 아래 두 가지가 다르다:
 *  1) **멀티라인 헤더**: 헤더의 "예약방법(1:인터넷\n2:현장)" 등 따옴표 안 줄바꿈으로 헤더가 물리적
 *     3줄에 걸친다. 헤더 파싱 대신, **필드 수(≥16)·첫 필드가 숫자(OBJECTID)** 인 물리 라인만
 *     데이터로 취해 고정 인덱스로 읽는다(헤더 조각·빈 줄은 자연히 스킵).
 *  2) **id 네임스페이스 분리**: 대피소 OBJECTID(1~27)가 화장실 OBJECTID와 겹치므로,
 *     `sangil:facility:shelter-<obj>` 로 넣어 화장실(`sangil:facility:<obj>`)과 충돌을 피한다.
 *
 * 매핑: 지리산은 101·102·103, 도봉산은 1502(별도 코드)로 오므로 `OFFICE_TO_MOUNTAIN_SLUG`
 * (102·103·1502 반영)로 100% 매핑된다. 좌표는 위경도(WGS84), 고정 데이터라 정적 시드.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { splitCsvLine } from "../../lib/trails/parse-knps-csv";
import { resolveFacilityMountainSlug } from "./facility-mapping";

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
  return Number.isFinite(n) ? Math.round(n) : null;
}
function parseFloatOrNull(v: string | undefined): number | null {
  if (v == null) return null;
  const s = v.trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// 대피소 CSV 고정 컬럼 인덱스(0-based). 멀티라인 헤더라 이름 대신 위치로 읽는다.
const COL = {
  objectId: 0, // 순번(전역 고유)
  office: 1, // 공원사무소코드
  name: 4, // 명칭(한글)
  address: 6, // 주소(지번)
  capacity: 9, // 수용인원
  useYn: 11, // 이용구분(Y/N)
  elevation: 12, // 고도(m)
  lng: 13, // 경도
  lat: 14, // 위도
} as const;
const MIN_FIELDS = 16;

const OUT = process.argv[2];
const CSV_PATH = process.argv[3] ?? "shelter_2015_20151231..csv";

const text = new TextDecoder("euc-kr").decode(readFileSync(CSV_PATH));
const lines = text.split(/\r?\n/);

interface ShelterRow {
  extId: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number | null;
  address: string | null;
  elevation: number | null;
}

const byExt = new Map<string, ShelterRow>();
const perMountain = new Map<string, number>();
const unmappedOffice = new Map<string, number>();
let skippedUnused = 0;
let skippedNoCoord = 0;

for (const line of lines) {
  if (!line) continue;
  const f = splitCsvLine(line);
  // 데이터 행만: 필드 수 충족 + 첫 필드가 순번(숫자). 헤더 조각·빈 줄은 스킵된다.
  if (f.length < MIN_FIELDS) continue;
  if (!/^\d+$/.test((f[COL.objectId] ?? "").trim())) continue;

  const useYn = (f[COL.useYn] ?? "").trim().toUpperCase();
  if (useYn === "N" || useYn === "0") {
    skippedUnused++;
    continue;
  }
  const lat = parseFloatOrNull(f[COL.lat]);
  const lng = parseFloatOrNull(f[COL.lng]);
  if (lat === null || lng === null) {
    skippedNoCoord++;
    continue;
  }
  const office = (f[COL.office] ?? "").trim();
  const name = (f[COL.name] ?? "").trim();
  const address = (f[COL.address] ?? "").trim();
  const slug = resolveFacilityMountainSlug(office, name, address);
  if (!slug) {
    unmappedOffice.set(office, (unmappedOffice.get(office) ?? 0) + 1);
    continue;
  }

  // 화장실과 OBJECTID 가 겹치므로 shelter- 접두로 네임스페이스를 분리한다.
  const extId = `shelter-${(f[COL.objectId] ?? "").trim()}`;
  byExt.set(extId, {
    extId,
    slug,
    name,
    lat,
    lng,
    capacity: parseIntOrNull(f[COL.capacity]),
    address: address || null,
    elevation: parseIntOrNull(f[COL.elevation]),
  });
}

const rows: string[] = [];
for (const r of byExt.values()) {
  perMountain.set(r.slug, (perMountain.get(r.slug) ?? 0) + 1);
  rows.push(
    `  (${sqlStr(r.extId)}, '${r.slug}', ${sqlStr(r.name)}, ${r.lat}, ${r.lng}, ` +
      `${sqlNum(r.capacity)}, ${sqlStr(r.address)}, ${sqlNum(r.elevation)})`,
  );
}

console.log(`총 대피소(이용가능·매핑): ${rows.length}`);
console.log("\n== 산별 적재 대피소 수 ==");
for (const [slug, n] of [...perMountain.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${slug.padEnd(14)} ${n}`);
}
if (unmappedOffice.size > 0) {
  console.log("\n== 미매핑 사무소 → 제외 ==");
  for (const [office, n] of [...unmappedOffice.entries()].sort()) {
    console.log(`  office ${office}: ${n}개`);
  }
}
console.log(`\n스킵 — 미이용: ${skippedUnused}, 좌표 결측: ${skippedNoCoord}`);

const sql = `-- 편의시설(대피소) 시드 데이터 (Task 045 확장).
-- supabase/seed/gen-shelters.ts 로 국립공원공단 대피소 CSV(로컬·CP949) 에서 생성.
-- 사무소코드 → 산 매핑(지리산 101·102·103, 도봉산 1502), 이용가능·매핑 성공만 적재.
-- id 는 shelter- 접두 네임스페이스라 화장실과 충돌하지 않는다. 재실행 멱등. 재생성:
--   npx tsx supabase/seed/gen-shelters.ts supabase/seed/shelters.sql

create extension if not exists "uuid-ossp";

insert into public.facilities
  (id, mountain_id, type, name, lat, lng, capacity, address, elevation)
select
  uuid_generate_v5('${NS}', 'sangil:facility:' || v.ext_id),
  uuid_generate_v5('${NS}', 'sangil:' || v.slug),
  'shelter',
  v.name, v.lat::double precision, v.lng::double precision,
  v.capacity::int, v.address, v.elevation::int
from (values
${rows.join(",\n")}
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
`;

if (OUT) {
  writeFileSync(OUT, sql);
  console.log(`\n→ ${OUT} 작성 (${rows.length} shelters)`);
} else {
  console.log("\n" + sql.slice(0, 600));
}
