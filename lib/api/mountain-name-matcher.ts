/**
 * 국립공원 사무소코드 → 산 매핑 (Task 017).
 *
 * CSV 에는 산 이름 컬럼이 없고 **공원사무소코드 + 탐방코스명** 만 있다. 사무소는 국립공원과
 * 1:1 대응하므로, 사무소코드 → 시드된 산(slug) 매핑 테이블로 코스를 산에 연결한다.
 *
 * 예외: **북한산 국립공원(사무소 1501)** 은 북한산·도봉산 두 산을 함께 관할하므로
 * 코스명 키워드로 분리한다(도봉지구 능선/봉우리 명칭 → 도봉산, 그 외 → 북한산).
 *
 * 미매핑 사무소(해상·경주 등 산악형 아님, 또는 시드 미포함 산)는 null → 시드 대상에서 제외.
 * 시드된 산이라도 이 CSV(2023 스냅샷)에 없으면(무등산·팔공산·태백산·대둔산 등) 미보유 →
 * 조회 시 "정보 없음" 폴백.
 */

/** 사무소코드 → 산 slug(gen-mountains 의 slug 와 동일). 1501 은 코스명으로 분리하므로 제외. */
export const OFFICE_TO_MOUNTAIN_SLUG: Record<string, string> = {
  "101": "jirisan", // 지리산
  "201": "gyeryongsan", // 계룡산
  "401": "seoraksan", // 설악산
  "501": "songnisan", // 속리산(괴산 칠보산·쌍곡 지구 포함)
  "601": "naejangsan", // 내장산
  "701": "gayasan", // 가야산
  "801": "deogyusan", // 덕유산
  "901": "odaesan", // 오대산
  "1001": "juwangsan", // 주왕산
  "1301": "chiaksan", // 치악산
  "1401": "woraksan", // 월악산(금수산·도락산·구담봉 등)
  "1601": "sobaeksan", // 소백산
  "1701": "wolchulsan", // 월출산
  "2001": "hallasan", // 한라산
};

/** 북한산 국립공원(1501) 중 도봉지구로 분류할 코스명 키워드(도봉 고유 능선·봉우리·탐방지원센터). */
const DOBONG_KEYWORDS = [
  "도봉",
  "오봉",
  "사패",
  "포대",
  "망월사",
  "자운",
  "우이암",
  "다락능선",
  "원도봉",
  "회룡",
  "송추",
];

/**
 * 사무소코드 + 코스명 → 산 slug. 매핑 불가 시 null.
 * @param office     공원사무소코드
 * @param courseName 탐방코스(한글)
 */
export function resolveMountainSlug(office: string, courseName: string): string | null {
  if (office === "1501") {
    return DOBONG_KEYWORDS.some((k) => courseName.includes(k)) ? "dobongsan" : "bukhansan";
  }
  return OFFICE_TO_MOUNTAIN_SLUG[office] ?? null;
}

/** 코스명 정규화(연속 공백 축약·트림). 매핑/표시용. */
export function normalizeCourseName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

/** 시드 대상이 아닌(탐방로가 아닌) 코스명 필터: 빈 이름·플레이스홀더 제외. */
export function isValidCourseName(name: string): boolean {
  const n = normalizeCourseName(name);
  if (n === "") return false;
  if (n === "비매칭코스") return false;
  return true;
}
