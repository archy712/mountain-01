/**
 * 후기 집계 순수 로직 (Task 048).
 *
 * 공개(숨김 제외) 후기 행의 별점만 받아 "개수·평균·별점 분포"를 집계한다. 프레임워크·
 * 네트워크 의존이 없는 순수 함수라 경계(0건·전부 동일 별점·반올림)를 단위 검증할 수 있다.
 * 평균은 소수 첫째 자리 반올림(4.25→4.3), 분포는 5→1점 내림차순으로 낸다.
 */

/** 집계 입력 1건 — 별점(1~5)만 필요. */
export interface ReviewRatingRow {
  rating: number;
}

export interface RatingBucket {
  /** 별점(1~5) */
  star: number;
  /** 해당 별점 후기 수 */
  count: number;
}

export interface ReviewSummary {
  /** 공개 후기 수 */
  count: number;
  /** 평균 별점(0건이면 0, 아니면 소수 첫째 자리 반올림) */
  average: number;
  /** 별점 분포(5→1점 내림차순, 없는 별점도 count 0 으로 채움) */
  distribution: RatingBucket[];
}

/** 유효 별점(1~5 정수)만 인정. 범위 밖·비정수는 집계에서 제외해 방어한다. */
function isValidRating(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

/**
 * 후기 별점 행을 요약 통계로 집계한다.
 * 입력은 이미 공개(숨김 제외) 필터를 거친 행이어야 한다.
 */
export function computeReviewSummary(rows: ReviewRatingRow[]): ReviewSummary {
  const counts = new Map<number, number>([
    [5, 0],
    [4, 0],
    [3, 0],
    [2, 0],
    [1, 0],
  ]);

  let sum = 0;
  let valid = 0;
  for (const r of rows) {
    if (!isValidRating(r.rating)) continue;
    counts.set(r.rating, (counts.get(r.rating) ?? 0) + 1);
    sum += r.rating;
    valid += 1;
  }

  const average = valid === 0 ? 0 : Math.round((sum / valid) * 10) / 10;
  const distribution: RatingBucket[] = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: counts.get(star) ?? 0,
  }));

  return { count: valid, average, distribution };
}
