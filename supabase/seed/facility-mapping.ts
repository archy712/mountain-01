/**
 * 편의시설(화장실·대피소) 시드의 공통 산 매핑 (Task 045).
 *
 * 국립공원공단 시설 데이터는 산 이름 없이 **공원사무소코드**만 가지므로, 사무소 → 산 slug
 * 매핑(`OFFICE_TO_MOUNTAIN_SLUG`)을 재사용한다. 북한산 사무소(1501)만 코스명이 없는 시설에서
 * 북한산/도봉산 분리가 필요해 **주소**로 가른다(도봉구·의정부·양주 → 도봉산).
 * 참고: 대피소 데이터는 도봉산을 별도 코드(1502)로 주므로, 그 경우엔 매핑 표가 바로 처리한다.
 *
 * gen-facilities.ts(화장실)·gen-shelters.ts(대피소)가 공유한다(실행 부작용 없는 순수 모듈).
 */

import { OFFICE_TO_MOUNTAIN_SLUG } from "../../lib/api/mountain-name-matcher";

export function resolveFacilityMountainSlug(
  office: string,
  name: string,
  address: string,
): string | null {
  if (office === "1501") {
    const isDobong = /도봉구|의정부|양주/.test(address) || /도봉|회룡|송추/.test(name);
    return isDobong ? "dobongsan" : "bukhansan";
  }
  return OFFICE_TO_MOUNTAIN_SLUG[office] ?? null;
}
