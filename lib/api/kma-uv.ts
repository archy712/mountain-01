/**
 * 기상청 생활기상지수 V5 자외선(getUVIdxV5) 연동 — 캐싱·오케스트레이션 (Task 022, 결정 001 #6).
 *
 * 서버 전용. `areaNo`(행정구역 법정동코드 10자리)로 조회하며, 응답 원시값을 `'use cache'`
 * (uv-3h)로 캐싱하고 순수 코어(kma-uv-core.ts)로 `UvIndex` 를 만든다.
 *
 * areaNo 매핑(결정 001 #6): 위경도→areaNo 변환 API 가 없어, 시드 산별 시군구 법정동코드를
 * **라이브 검증(getUVIdxV5 resultCode 00)** 해 정적 테이블로 고정했다. 주의사항:
 *  - 강원(51)·전북(52)은 특별자치도 **신 코드**를 써야 한다(구 42·45 는 검색결과 없음).
 *  - **광주(29)·전남(46)은 서비스에 UV 데이터가 없어**(전 시군구·시도 코드 부재 확인),
 *    무등산·월출산은 최근접 유효 코드(전북 정읍 5218)로 근사한다. UV 는 위도 기반이라
 *    ±1° 오차의 영향이 작다(등급 버킷 변동 거의 없음).
 * 테이블에 없는 mountainId 는 `not_covered` 로 처리해 점수 계층이 UV 를 제외한다.
 *
 * serviceKey 는 `.env.local` 에 Encoding 형태라 `decodeURIComponent` 로 미리 풀어 넘긴다
 * (fetcher 의 URLSearchParams 가 정확히 한 번만 인코딩 — 날씨·에어코리아와 동일 규칙).
 */

import { cacheLife, cacheTag } from "next/cache";
import type { PartialResult, UvIndex } from "@/lib/types";
import { serverEnv } from "@/lib/env";
import { fetchJson } from "./fetcher";
import { withStaleFallback } from "./cache";
import { CACHE_PROFILE, mountainTag, sourceTag, uvKey } from "./cache";
import { getUvBaseTime, normalizeUv, type UvResponse } from "./kma-uv-core";

const UV_URL = "https://apis.data.go.kr/1360000/LivingWthrIdxServiceV5/getUVIdxV5";

/**
 * 시드 산(mountainId) → 자외선 조회용 areaNo(법정동코드 10자리).
 * 전 항목 라이브 검증 완료(2026-08-08). 광주·전남 미커버 2종은 최근접 유효 코드(정읍)로 근사.
 * 새 산 추가 시 여기에 검증된 areaNo 를 등록한다(미등록 시 not_covered → UV 제외).
 */
export const MOUNTAIN_AREA_NO: Record<string, string> = {
  "f9ce17de-a38c-52ae-aba5-67111f782fcf": "1130500000", // 북한산 → 서울 강북구
  "fe04d784-dc63-5a7f-bf66-5c8861b7e029": "1132000000", // 도봉산 → 서울 도봉구
  "96e599f1-4c55-51e9-8b8b-91037589b00d": "1162000000", // 관악산 → 서울 관악구
  "74e3507f-50ea-572d-bf04-d7748c8c4faa": "4113000000", // 청계산 → 경기 성남시
  "0c5a49a3-b916-5ff4-9a3c-caa8e6aa6073": "1114000000", // 남산 → 서울 중구
  "8f3c343a-16a2-5a51-b434-ead87cf2e90f": "1135000000", // 수락산 → 서울 노원구
  "1a107970-ee4a-5dcd-9351-1373a067627d": "5183000000", // 설악산 → 강원 양양군(신51)
  "cf6f3bff-497a-5656-b3f9-d9684a0f8cae": "5176000000", // 오대산 → 강원 평창군(신51)
  "e2d25ee6-a1b6-59fa-8d1e-c4f15932459c": "5113000000", // 치악산 → 강원 원주시(신51)
  "32d7b205-b97f-5c07-ac52-99ec0b57814c": "5123000000", // 태백산 → 강원 태백시(신51)
  "7caf3f2f-fc5a-554a-9c0c-ecb8211b73e6": "4873000000", // 지리산 → 경남 산청군
  "5d4b8638-93ec-55f2-8bbc-e92c617fdef3": "5273000000", // 덕유산 → 전북 무주군(신52)
  "1e1a8656-1216-54ae-9db1-72163485a340": "4415000000", // 계룡산 → 충남 공주시
  "7f214088-423a-5bba-a637-ba77a647b628": "4372000000", // 속리산 → 충북 보은군
  "086f9a74-129c-5b6a-ad6c-f3a240f2077c": "4380000000", // 소백산 → 충북 단양군
  "dd507142-506a-5687-b8ae-e0b2015247b7": "4315000000", // 월악산 → 충북 제천시
  "2c082588-e855-5597-8730-cd5d43373424": "4889000000", // 가야산 → 경남 합천군
  "16aa04a6-b3b3-5d78-b7f1-c977ef4ef3e4": "4775000000", // 주왕산 → 경북 청송군
  "7830ce89-4c2b-5e0f-b9dc-4741cb3a5c86": "2714000000", // 팔공산 → 대구 동구
  "79b8d19d-af3c-54e2-b8e4-6e9eed6443da": "5218000000", // 내장산 → 전북 정읍시(신52)
  "8c82d52f-057f-5397-866e-492646d9e26e": "5218000000", // 무등산 → (광주 미커버) 전북 정읍 근사
  "0e415fd3-14fd-57c8-a027-435523a75152": "5218000000", // 월출산 → (전남 미커버) 전북 정읍 근사
  "7728f31a-24f8-52f6-8067-eba56305c910": "5013000000", // 한라산 → 제주 서귀포시
  "9d26b637-7aa2-54aa-86d4-070b60cfd2ac": "2641000000", // 금정산 → 부산 금정구
  "22b0fbd6-a112-5a71-8c32-fa85c63ec1bc": "4423000000", // 대둔산 → 충남 논산시
  "1f89d495-c319-5d05-acc0-5a936ef28cac": "2871000000", // 마니산 → 인천 강화군
  "c579de17-2fa9-513a-b66c-10423dc36be7": "4182000000", // 유명산 → 경기 가평군
  "cad7fbf3-5577-527f-babb-313e41a6383d": "4148000000", // 감악산 → 경기 파주시
  "3b47b068-f1fd-5ea1-a9ab-8311d53d3e03": "1111000000", // 북악산 → 서울 종로구
  "608b3026-cef5-5226-8e06-456aa576a7cf": "1111000000", // 인왕산 → 서울 종로구
};

/**
 * 자외선 원시 응답을 캐싱 조회한다(`'use cache'`, uv-3h).
 * 캐시 키는 (areaNo, 발표시각) 로 결정돼 같은 발표분 재조회를 캐시 히트시킨다.
 */
async function fetchUv(mountainId: string, areaNo: string, baseTime: string): Promise<UvResponse> {
  "use cache";
  cacheLife(CACHE_PROFILE.uv);
  cacheTag(uvKey(areaNo, baseTime), mountainTag(mountainId), sourceTag("uv"));

  return fetchJson<UvResponse>(UV_URL, {
    searchParams: {
      serviceKey: decodeURIComponent(serverEnv.kmaLivingIndexKey),
      returnType: "json",
      dataType: "JSON",
      areaNo,
      time: baseTime,
      numOfRows: 1,
      pageNo: 1,
    },
  });
}

/**
 * 산의 오늘 자외선 지수를 조회한다.
 * - areaNo 미매핑(광주·전남 등 미커버 포함) → failure(not_covered): 점수 계층이 UV 제외
 * - 조회 실패 → 마지막 성공 스냅샷으로 폴백("N분 전 기준"), 없으면 failure
 * 절대 throw 하지 않는다(부분 실패 격리).
 */
export async function getUvIndex(
  mountainId: string,
  now: Date = new Date(),
): Promise<PartialResult<UvIndex>> {
  const areaNo = MOUNTAIN_AREA_NO[mountainId];
  if (!areaNo) {
    return {
      status: "failure",
      error: {
        code: "not_covered",
        message: "이 지역의 자외선 정보는 제공되지 않습니다.",
      },
    };
  }

  const { baseTime, baseKst } = getUvBaseTime(now);
  const key = uvKey(areaNo, baseTime);

  return withStaleFallback(key, async () => {
    const raw = await fetchUv(mountainId, areaNo, baseTime);
    const normalized = normalizeUv(raw, baseKst, now);
    if (normalized.status === "failure") {
      // producer 계약: 실패는 throw 로 신호. errors.toApiError 가 실린 apiError 보존.
      throw Object.assign(new Error(normalized.error.message), { apiError: normalized.error });
    }
    return normalized.data;
  });
}
