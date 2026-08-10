/**
 * 방문완료 통계 집계 순수 로직 (Task 040).
 *
 * `visited` 행(본인 것만, RLS)과 각 산의 지역·100대명산 여부를 받아 "다녀온 산 수·올해
 * 방문 수·100대명산 진척·지역 분포"를 집계한다. 프레임워크·네트워크 의존이 없는 순수
 * 함수라 경계(0건·비-100대명산만·연도 경계)를 단위 검증할 수 있다. 방문 행은 (user, mountain)
 * 유니크라 한 산이 중복되지 않으므로, 행 수가 곧 서로 다른 산의 수다.
 */

/** 산림청 100대명산 총수(진척 분모, Task 036 시드 기준 고정). */
export const TOP100_TOTAL = 100;

/** 집계 입력 1건 — 방문일(ISO) + 산의 지역·100대명산 여부. */
export interface VisitedStatsRow {
  visitedAt: string;
  region: string;
  isTop100: boolean;
}

export interface RegionCount {
  region: string;
  count: number;
}

export interface VisitedStats {
  /** 다녀온 산 수(= 방문 행 수) */
  total: number;
  /** 올해(KST 연도) 방문 수 */
  thisYear: number;
  /** 방문한 100대명산 수 */
  top100Visited: number;
  /** 100대명산 총수(분모) */
  top100Total: number;
  /** 지역별 방문 수(내림차순, 동수는 가나다순) */
  regions: RegionCount[];
}

/** Date 의 KST(=UTC+9, DST 없음) 벽시계 연도. */
function kstYearOf(d: Date): number {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).getUTCFullYear();
}

/**
 * 방문 행을 통계로 집계한다.
 * @param now 기준 시각 주입(테스트 결정성). "올해"는 이 시각의 KST 연도로 판정한다.
 */
export function computeVisitedStats(rows: VisitedStatsRow[], now: Date = new Date()): VisitedStats {
  const currentYear = kstYearOf(now);
  let thisYear = 0;
  let top100Visited = 0;
  const regionMap = new Map<string, number>();

  for (const r of rows) {
    if (kstYearOf(new Date(r.visitedAt)) === currentYear) thisYear++;
    if (r.isTop100) top100Visited++;
    regionMap.set(r.region, (regionMap.get(r.region) ?? 0) + 1);
  }

  const regions = [...regionMap.entries()]
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count || a.region.localeCompare(b.region, "ko"));

  return {
    total: rows.length,
    thisYear,
    // 유니크 제약상 초과할 수 없지만, 데이터 이상 시에도 분모를 넘지 않도록 방어.
    top100Visited: Math.min(top100Visited, TOP100_TOTAL),
    top100Total: TOP100_TOTAL,
    regions,
  };
}
