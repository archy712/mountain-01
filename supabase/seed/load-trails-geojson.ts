/**
 * 등산로 GeoJSON 원격 적재 로더 (Task 029).
 * 실행: npx tsx supabase/seed/load-trails-geojson.ts [mountain.csv]
 *
 * mountain.csv → RDP 단순화 지오메트리 → trails.path_geojson 을 **서비스 롤로 직접 UPDATE**.
 * (0.88MB SQL 을 MCP 로 인라인 전달하는 대신 원격 DB 에 바로 써 컨텍스트 비용 0.)
 *
 * 매칭키: (mountain_id, name). mountain_id 는 gen-trails 와 동일한 uuid v5('sangil:'+slug),
 * name 은 normalizeCourseName 결과라 시드된 trail 행과 정확히 대응한다 → 재실행 멱등.
 *
 * 필요 env(.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * ⚠️ 서비스 롤 키는 RLS 를 우회하므로 로컬 시드 전용. 절대 클라이언트/커밋에 노출 금지.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { buildTrailGeometries } from "../../lib/trails/csv-to-geojson";

// ── .env.local 로더(Node 스크립트는 자동 로드 안 됨) ──
function loadEnvLocal(): Record<string, string> {
  const env: Record<string, string> = {};
  let text = "";
  try {
    text = readFileSync(".env.local", "utf8");
  } catch {
    return env;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

// ── 결정론적 UUID v5 (gen-trails.ts 와 동일: 'sangil:' 접두) ──
const NS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
function uuidv5(name: string): string {
  const nsBytes = Buffer.from(NS.replace(/-/g, ""), "hex");
  const hash = createHash("sha1")
    .update(nsBytes)
    .update(Buffer.from("sangil:" + name, "utf8"))
    .digest();
  const b = hash.subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "✖ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 필요합니다.",
    );
    process.exit(1);
  }

  const csvPath = process.argv[2] ?? "mountain.csv";
  const geoms = buildTrailGeometries(csvPath, { toleranceMeters: 3 });
  console.log(`적재 대상 지오메트리: ${geoms.length}`);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let updated = 0;
  let unmatched = 0;
  let failed = 0;
  const CONCURRENCY = 8;

  for (let i = 0; i < geoms.length; i += CONCURRENCY) {
    const batch = geoms.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (g) => {
        const mid = uuidv5(g.slug);
        const geojson = { type: "MultiLineString", coordinates: g.coordinates };
        const { data, error } = await supabase
          .from("trails")
          .update({ path_geojson: geojson })
          .eq("mountain_id", mid)
          .eq("name", g.name)
          .select("id");
        if (error) {
          console.error(`  ✖ ${g.slug} / ${g.name}: ${error.message}`);
          failed++;
        } else if (!data || data.length === 0) {
          console.warn(`  ? 미매칭(시드 trail 없음): ${g.slug} / ${g.name}`);
          unmatched++;
        } else {
          updated++;
        }
      }),
    );
  }

  console.log(`\n완료 — 업데이트 ${updated} / 미매칭 ${unmatched} / 실패 ${failed}`);
  if (failed > 0) process.exit(1);
}

void main();
