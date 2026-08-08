/**
 * 에어코리아 대기오염정보 순수 로직 (Task 021).
 *
 * 프레임워크(next/cache)·환경변수·네트워크 의존이 없는 순수 함수만 모은다.
 * → 정규화를 프레임워크 밖에서 단위 검증할 수 있다.
 * 캐싱·네트워크 오케스트레이션은 `airkorea.ts` 가 담당한다.
 *
 * 대상 엔드포인트: `ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty`
 * (측정소명 기준 실시간 측정정보). PM10/PM2.5 농도·등급을 `AirQuality` 로 정규화한다.
 */

import type { AirQuality, PartialResult } from "@/lib/types";
import { AIR_GRADE_CODE_MAP } from "@/lib/types";
import { apiError } from "./errors";

/** 측정소 실시간 측정 항목(필요한 필드만). */
interface RealtimeItem {
  pm10Value?: string;
  pm25Value?: string;
  pm10Grade?: string;
  pm25Grade?: string;
  /** 측정 시각("YYYY-MM-DD HH:mm") */
  dataTime?: string;
}

export interface RealtimeResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: RealtimeItem[] };
  };
}

/**
 * 측정값 문자열 → number|null.
 * 에어코리아는 통신 장애/점검 시 "-" 를 넣으므로 숫자가 아니면 null(결측) 처리한다.
 */
function parseValue(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** 등급 코드("1"~"4") → AirGrade. 미매핑/결측은 null. */
function parseGrade(raw: string | undefined) {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  return AIR_GRADE_CODE_MAP[trimmed] ?? null;
}

/**
 * 실시간 측정정보 원시 응답 → `AirQuality` 정규화.
 * 파싱 실패 시 throw 하지 않고 `PartialResult.failure` 를 반환한다(부분 실패 격리).
 *
 * PM10·PM2.5 가 **둘 다 결측**이면 표시 가치가 없어 failure(parse_error).
 * 한쪽만 결측이면 해당 값만 null 로 두고 success 로 반환한다(점수 계층이 변수 제외).
 *
 * @param raw         getMsrstnAcctoRltmMesureDnsty 응답
 * @param stationName 매핑된 측정소명
 * @param distanceKm  산 ↔ 측정소 거리(km)
 */
export function normalizeAirQuality(
  raw: unknown,
  stationName: string,
  distanceKm: number,
): PartialResult<AirQuality> {
  const res = raw as RealtimeResponse;
  const code = res?.response?.header?.resultCode;
  if (code !== undefined && code !== "00") {
    const msg = res?.response?.header?.resultMsg;
    return {
      status: "failure",
      error: apiError("upstream_error", msg ? `에어코리아 응답 오류: ${msg}` : undefined),
    };
  }

  const items = res?.response?.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return {
      status: "failure",
      error: apiError("parse_error", "대기질 측정 데이터가 비어 있습니다."),
    };
  }

  // getMsrstnAcctoRltmMesureDnsty 는 최신순으로 반환한다(첫 항목이 가장 최근 측정).
  const latest = items[0];
  const pm10 = parseValue(latest.pm10Value);
  const pm25 = parseValue(latest.pm25Value);

  if (pm10 === null && pm25 === null) {
    return {
      status: "failure",
      error: apiError("parse_error", "측정소의 미세먼지 값이 결측입니다."),
    };
  }

  const airQuality: AirQuality = {
    pm10,
    pm25,
    pm10Grade: parseGrade(latest.pm10Grade),
    pm25Grade: parseGrade(latest.pm25Grade),
    stationName,
    distanceKm,
  };

  return { status: "success", data: airQuality, fetchedAt: new Date().toISOString() };
}
