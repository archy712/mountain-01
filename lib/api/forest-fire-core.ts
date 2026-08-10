/**
 * 산림청 국립산림과학원 산불위험예보정보(시도) 순수 로직 (Task 043, 결정 001).
 *
 * 프레임워크(next/cache)·환경변수·네트워크 의존이 없는 순수 함수만 모은다.
 * → 등급 분류·시도 매핑·정규화를 프레임워크 밖에서 단위 검증할 수 있다.
 * 캐싱·네트워크 오케스트레이션은 `forest-fire.ts` 가 담당한다.
 *
 * 응답 구조(라이브 확인): `response.body.items.item[]`, 각 원소는
 *   `regioncode`(시도 코드)·`doname`(시도명)·`meanavg`(평균지수)·`maxi`/`mini`(최대/최소)·
 *   `std`(표준편차)·`d1~d4`(등급별 면적 분포%)·`analdate`(분석일시 "YYYY-MM-DD HH").
 * 시도 1회 호출로 전국 16개 시도가 모두 온다(regioncode 로 조회 파라미터 불필요).
 *
 * 시도 코드 특이점(라이브 확인 2026-08-10):
 *  - 강원=51·전북=52 는 특별자치도 신 코드(구 42·45 아님).
 *  - **광주·전남은 code 12 "전남광주통합특별시"로 통합**되어 나온다(29·46 부재).
 */

import type { ApiError, FireLevel, FireRisk } from "@/lib/types";
import { apiError } from "./errors";

/** 위험 등급 경계(지수 1~100, 결정 001). */
const LEVEL_VERY_HIGH = 86;
const LEVEL_HIGH = 66;
const LEVEL_MODERATE = 51;

/** 산불위험지수(0~100) → 4단계 등급. */
export function classifyFireLevel(index: number): FireLevel {
  if (index >= LEVEL_VERY_HIGH) return "very-high";
  if (index >= LEVEL_HIGH) return "high";
  if (index >= LEVEL_MODERATE) return "moderate";
  return "low";
}

/**
 * 산 마스터 `region` 토큰(광역 시·도) → 산불위험예보 시도 코드.
 * REGION_ORDER(100대명산·추천 화면)와 동일 토큰을 쓴다. 광주·전남은 통합 코드 12 로 매핑.
 */
export const SIDO_REGION_CODE: Record<string, number> = {
  서울: 11,
  부산: 26,
  대구: 27,
  인천: 28,
  광주: 12,
  대전: 30,
  울산: 31,
  세종: 36,
  경기: 41,
  강원: 51,
  충북: 43,
  충남: 44,
  전북: 52,
  전남: 12,
  경북: 47,
  경남: 48,
  제주: 50,
};

/** 정규화된 시도 산불위험 1건. */
export interface FireSidoDatum {
  regioncode: number;
  /** 대표 지수(평균값 meanavg) */
  index: number;
  regionName: string;
  analdate: string;
}

export type FireSidoNormalized =
  { status: "success"; data: FireSidoDatum[] } | { status: "failure"; error: ApiError };

/** 산불위험예보(시도) 원시 응답 형태(느슨한 파싱용). */
export interface FireSidoResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: { item?: unknown[] } | null;
      totalCount?: number;
    };
  };
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * 원시 응답 → 시도 데이터 배열. resultCode≠00·빈 items 는 failure.
 * 개별 원소가 필수 필드(regioncode·meanavg)를 결여하면 건너뛴다(부분 유효).
 */
export function normalizeFireSido(raw: FireSidoResponse): FireSidoNormalized {
  const header = raw.response?.header;
  if (header?.resultCode && header.resultCode !== "00") {
    return {
      status: "failure",
      error: apiError("upstream_error", `산불위험예보 오류(${header.resultCode})`),
    };
  }

  const items = raw.response?.body?.items?.item;
  if (!Array.isArray(items) || items.length === 0) {
    return {
      status: "failure",
      error: apiError("not_covered", "산불위험예보 데이터가 없습니다."),
    };
  }

  const data: FireSidoDatum[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const row = it as Record<string, unknown>;
    const regioncode = toNumber(row.regioncode);
    const index = toNumber(row.meanavg);
    if (regioncode === null || index === null) continue;
    data.push({
      regioncode,
      index,
      regionName: typeof row.doname === "string" ? row.doname : "",
      analdate: typeof row.analdate === "string" ? row.analdate : "",
    });
  }

  if (data.length === 0) {
    return {
      status: "failure",
      error: apiError("parse_error", "산불위험예보 응답을 해석할 수 없습니다."),
    };
  }
  return { status: "success", data };
}

/**
 * 산의 `region`(예: "서울·경기", "광주·전남") → 대표 산불위험.
 * 여러 시도에 걸친 산은 각 시도 지수 중 **최댓값**을 채택한다(안전 우선: 한 곳이라도 높으면
 * 경계). 매핑되는 시도 데이터가 하나도 없으면 null(점수 계층이 fire 를 제외).
 */
export function fireRiskForRegion(
  region: string,
  byCode: Map<number, FireSidoDatum>,
): FireRisk | null {
  const tokens = region.split("·").map((t) => t.trim());
  const codes = new Set<number>();
  for (const t of tokens) {
    const code = SIDO_REGION_CODE[t];
    if (code !== undefined) codes.add(code);
  }

  let picked: FireSidoDatum | null = null;
  for (const code of codes) {
    const datum = byCode.get(code);
    if (!datum) continue;
    if (picked === null || datum.index > picked.index) picked = datum;
  }
  if (picked === null) return null;

  return {
    index: picked.index,
    level: classifyFireLevel(picked.index),
    regionName: picked.regionName,
    analdate: picked.analdate,
  };
}

/** KST(=UTC+9) 벽시계 Date. */
function toKst(now: Date): Date {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * 캐시 슬롯(YYYYMMDD, 3시간 단위 HH)을 KST 기준으로 구한다. 발표주기(3시간)에 정렬해
 * TTL(fire-3h)과 맞춰 같은 슬롯 재조회를 캐시 히트시킨다.
 */
export function getFireSlot(now: Date = new Date()): { yyyymmdd: string; slot: string } {
  const kst = toKst(now);
  const yyyymmdd = `${kst.getUTCFullYear()}${pad2(kst.getUTCMonth() + 1)}${pad2(kst.getUTCDate())}`;
  const slot = pad2(Math.floor(kst.getUTCHours() / 3) * 3);
  return { yyyymmdd, slot };
}
