/**
 * 등산로 GeoJSON 시드 생성기 (Task 029).
 * 실행: npx tsx supabase/seed/gen-trails-geojson.ts supabase/seed/trails_geojson.sql
 *
 * mountain.csv(로컬·CP949) → 코스별 좌표 → RDP 단순화(3m) → (산,코스명) MultiLineString
 * → trails.path_geojson UPDATE SQL 생성.
 *
 * id 는 gen-trails 와 동일하게 SQL 의 uuid_generate_v5('sangil:trail:'||slug||':'||name)
 * 로 계산한다(payload 에는 slug·name·geojson 만 담아 UUID 전사 오류를 없앤다). 스키마의
 * path_geojson 컬럼은 Task 007 에서 이미 생성됨 → 여기서는 데이터 UPDATE 만 한다.
 */

import { writeFileSync } from "node:fs";

import { buildTrailGeometries } from "../../lib/trails/csv-to-geojson";

function sqlStr(v: string): string {
  return `'${v.replace(/'/g, "''")}'`;
}

const OUT = process.argv[2];
const CSV_PATH = process.argv[3] ?? "mountain.csv";

const geoms = buildTrailGeometries(CSV_PATH, { toleranceMeters: 3 });

let rawTotal = 0;
let simpTotal = 0;
const perMountain = new Map<string, number>();
for (const g of geoms) {
  rawTotal += g.rawPoints;
  simpTotal += g.simplifiedPoints;
  perMountain.set(g.slug, (perMountain.get(g.slug) ?? 0) + 1);
}

const rows = geoms.map((g) => {
  const geojson = JSON.stringify({ type: "MultiLineString", coordinates: g.coordinates });
  return `  (${sqlStr(g.slug)}, ${sqlStr(g.name)}, ${sqlStr(geojson)})`;
});

const NS_SQL = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const sql = `-- 등산로 GeoJSON 시드 (Task 029).
-- supabase/seed/gen-trails-geojson.ts 로 국립공원공단 mountain.csv(로컬·CP949) 에서 생성.
-- 코스ID 세그먼트 좌표 → RDP 단순화(3m) → (산,코스명) MultiLineString 집약.
-- trails.path_geojson(Task 007 에서 이미 생성된 jsonb 컬럼)에 UPDATE 로 적재한다.
-- id 는 gen-trails 와 동일한 uuid_generate_v5 파생키로 매칭 → 재실행 멱등.
-- 재생성: npx tsx supabase/seed/gen-trails-geojson.ts supabase/seed/trails_geojson.sql

create extension if not exists "uuid-ossp";

update public.trails t
set path_geojson = v.geojson::jsonb
from (values
${rows.join(",\n")}
) as v(slug, name, geojson)
where t.id = uuid_generate_v5('${NS_SQL}', 'sangil:trail:' || v.slug || ':' || v.name);
`;

const bytes = Buffer.byteLength(sql, "utf8");
console.log(`적재 대상 trail(지오메트리): ${geoms.length}`);
console.log(
  `원본 점 합계: ${rawTotal.toLocaleString()} → 단순화 후: ${simpTotal.toLocaleString()} (${((simpTotal / rawTotal) * 100).toFixed(1)}%)`,
);
console.log(`SQL 크기: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.log("\n== 산별 trail 수 ==");
for (const [slug, n] of [...perMountain.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${slug.padEnd(14)} ${n}`);
}

if (OUT) {
  writeFileSync(OUT, sql);
  console.log(`\n→ ${OUT} 작성`);
}
