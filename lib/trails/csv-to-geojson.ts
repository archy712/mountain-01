/**
 * 국립공원공단 탐방로 CSV(`mountain.csv`) → 코스별 GeoJSON LineString 변환 파이프라인
 * (Task 029). Node 전용(대용량 파일·CP949). Next 런타임 번들에 포함되지 않는다.
 *
 * 파이프라인:
 *   1. CSV(euc-kr)를 코스ID 단위로 스트리밍 파싱 — 각 행은 순서대로 이어지는 한 GPS 점.
 *   2. (산 slug, 코스명) 으로 집약 — Task 017 gen-trails 와 **동일한 매핑·정규화**를 써서
 *      같은 trail 행(id = uuid_generate_v5('sangil:trail:'||slug||':'||name))에 붙는다.
 *   3. courseID 세그먼트별 LineString 을 **RDP(Ramer–Douglas–Peucker) 단순화**(허용오차
 *      기본 3m)해 점 수를 줄이고, 한 trail 은 세그먼트들을 모은 MultiLineString 으로 만든다.
 *
 * 좌표는 원본이 WGS84 위경도라 재투영 불필요(결정 001 #15 PoC 통과). GeoJSON 규약대로
 * [경도, 위도] 순서로 저장한다.
 */

import { readFileSync } from "node:fs";

import {
  isValidCourseName,
  normalizeCourseName,
  resolveMountainSlug,
} from "@/lib/api/mountain-name-matcher";

/** 한 trail(= 산 slug + 코스명)의 집약 지오메트리. */
export interface TrailGeometry {
  /** 산 slug(gen-mountains 와 동일) */
  slug: string;
  /** 정규화된 코스명(gen-trails 와 동일) */
  name: string;
  /** MultiLineString 좌표: 세그먼트 배열, 각 세그먼트는 [경도, 위도] 점 배열 */
  coordinates: [number, number][][];
  /** 단순화 전 총 점 수(로깅용) */
  rawPoints: number;
  /** 단순화 후 총 점 수(로깅용) */
  simplifiedPoints: number;
}

const COLUMNS = {
  mgmtNo: "국립공원관리번호",
  office: "공원사무소코드",
  courseId: "코스ID",
  name: "탐방코스(한글)",
  lng: "경도",
  lat: "위도",
} as const;

/** 코스ID 단위로 순서를 보존해 모은 원본 점 묶음. */
interface RawCourse {
  office: string;
  name: string;
  points: [number, number][]; // [경도, 위도]
}

/**
 * CSV 를 CP949 로 디코딩해 코스ID 단위로 [경도,위도] 점을 순서대로 모은다.
 * 필드에 쉼표/따옴표가 없는 데이터라 단순 분할로 안전하다(열 수 부족·좌표 결측 행은 스킵).
 */
function readRawCourses(filePath: string): Map<string, RawCourse> {
  const text = new TextDecoder("euc-kr").decode(readFileSync(filePath));
  const lines = text.split(/\r?\n/);
  const header = lines[0].split(",");
  const idx = (name: string) => header.indexOf(name);

  const iMgmt = idx(COLUMNS.mgmtNo);
  const iOffice = idx(COLUMNS.office);
  const iCourse = idx(COLUMNS.courseId);
  const iName = idx(COLUMNS.name);
  const iLng = idx(COLUMNS.lng);
  const iLat = idx(COLUMNS.lat);

  if ([iMgmt, iOffice, iCourse, iName, iLng, iLat].some((i) => i < 0)) {
    throw new Error("mountain.csv 헤더에서 좌표/코스 열을 찾지 못했습니다. 포맷을 확인하세요.");
  }

  const byKey = new Map<string, RawCourse>();
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line) continue;
    const f = line.split(",");
    if (f.length < header.length) continue;

    const lng = Number(f[iLng]);
    const lat = Number(f[iLat]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;

    const key = `${f[iMgmt]}-${f[iOffice]}-${f[iCourse]}`;
    let course = byKey.get(key);
    if (!course) {
      course = { office: f[iOffice], name: (f[iName] ?? "").trim(), points: [] };
      byKey.set(key, course);
    }
    course.points.push([lng, lat]);
  }

  return byKey;
}

/**
 * 두 점 A,B 를 잇는 선분에 대한 점 P 의 수직 거리(미터). 위경도 델타를 A 위도 기준
 * equirectangular(등거리 원통) 근사로 미터 평면에 투영해 계산한다(국지 스케일에서 충분).
 */
function perpendicularMeters(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const latRad = (a[1] * Math.PI) / 180;
  const mPerDegLng = 111320 * Math.cos(latRad);
  const mPerDegLat = 110540;
  const px = (p[0] - a[0]) * mPerDegLng;
  const py = (p[1] - a[1]) * mPerDegLat;
  const bx = (b[0] - a[0]) * mPerDegLng;
  const by = (b[1] - a[1]) * mPerDegLat;
  const segLen2 = bx * bx + by * by;
  if (segLen2 === 0) return Math.hypot(px, py); // A==B (퇴화 선분)
  // 점을 선분에 사영해 수선의 발까지 거리
  const t = (px * bx + py * by) / segLen2;
  const cx = t * bx;
  const cy = t * by;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Ramer–Douglas–Peucker 단순화(반복 구현 — 코스당 수천 점이라 재귀 깊이 폭주 방지).
 * 허용오차(미터)보다 편차가 큰 점만 남긴다. 시작·끝점은 항상 보존한다.
 */
export function simplifyLine(
  points: [number, number][],
  toleranceMeters: number,
): [number, number][] {
  if (points.length <= 2) return points.slice();

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let maxDist = -1;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpendicularMeters(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > toleranceMeters && index !== -1) {
      keep[index] = true;
      stack.push([first, index]);
      stack.push([index, last]);
    }
  }

  const out: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) out.push(points[i]);
  }
  return out;
}

/** 좌표를 6자리(≈0.1m)로 반올림해 저장 용량을 줄인다. */
function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/**
 * CSV 를 읽어 (산, 코스명) 단위 GeoJSON 지오메트리 목록을 만든다.
 * gen-trails 와 동일한 매핑/정규화를 적용해, 미매핑 사무소·무효 코스명은 제외한다.
 */
export function buildTrailGeometries(
  filePath: string,
  opts: { toleranceMeters?: number } = {},
): TrailGeometry[] {
  const tolerance = opts.toleranceMeters ?? 3;
  const rawCourses = readRawCourses(filePath);

  interface Agg {
    slug: string;
    name: string;
    coordinates: [number, number][][];
    rawPoints: number;
    simplifiedPoints: number;
  }
  const merged = new Map<string, Agg>();

  for (const course of rawCourses.values()) {
    if (!isValidCourseName(course.name)) continue;
    const slug = resolveMountainSlug(course.office, course.name);
    if (!slug) continue;
    if (course.points.length < 2) continue; // 선으로 만들 수 없는 단일/빈 점

    const name = normalizeCourseName(course.name);
    const simplified = simplifyLine(course.points, tolerance).map(
      ([lng, lat]) => [round6(lng), round6(lat)] as [number, number],
    );
    if (simplified.length < 2) continue;

    const dkey = `${slug} ${name}`;
    let agg = merged.get(dkey);
    if (!agg) {
      agg = { slug, name, coordinates: [], rawPoints: 0, simplifiedPoints: 0 };
      merged.set(dkey, agg);
    }
    agg.coordinates.push(simplified);
    agg.rawPoints += course.points.length;
    agg.simplifiedPoints += simplified.length;
  }

  return [...merged.values()];
}
