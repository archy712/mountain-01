/**
 * 컨디션 점수·장비 추천 도메인 타입 (결정 003 #10·#11, PRD 4.2 v1).
 * 점수 계산은 서버 유틸에서만 수행하고 `calcVersion` 으로 태깅한다(Task 023).
 */

/** 점수 감점/추천에 관여하는 입력 변수 */
export type ScoreFactor = "pop" | "pty" | "temp" | "wind" | "air" | "uv";

export const SCORE_FACTOR_LABEL: Record<ScoreFactor, string> = {
  pop: "강수확률",
  pty: "강수형태",
  temp: "기온",
  wind: "풍속",
  air: "미세먼지",
  uv: "자외선",
};

/**
 * 점수 등급 (결정 003 동결 구간).
 * 80~100 매우좋음 / 60~79 좋음 / 40~59 보통 / 20~39 나쁨 / 0~19 위험
 */
export type ScoreGrade = "excellent" | "good" | "fair" | "poor" | "dangerous";

export const SCORE_GRADE_LABEL: Record<ScoreGrade, string> = {
  excellent: "매우 좋음",
  good: "좋음",
  fair: "보통",
  poor: "나쁨",
  dangerous: "위험",
};

/** 점수 → 등급 구간 경계(하한 포함) */
export const SCORE_GRADE_THRESHOLDS: ReadonlyArray<{ min: number; grade: ScoreGrade }> = [
  { min: 80, grade: "excellent" },
  { min: 60, grade: "good" },
  { min: 40, grade: "fair" },
  { min: 20, grade: "poor" },
  { min: 0, grade: "dangerous" },
];

/** 감점 근거 1건 (예: 강수확률 70% −20) */
export interface ScoreBreakdownItem {
  factor: ScoreFactor;
  /** 표시용 근거 문구(예: "강수확률 70%") */
  label: string;
  /** 감점 크기(양수 magnitude, 표시 시 −부호 부여) */
  penalty: number;
}

export interface ConditionScore {
  /** 0~100 (감점 합 100 초과 시 0 클램프) */
  score: number;
  grade: ScoreGrade;
  /** 등급 메시지(예: "산행하기 완벽한 날!") */
  message: string;
  /** 상위 감점 요인 2~3개 */
  breakdown: ScoreBreakdownItem[];
  /** 부분 폴백으로 계산에서 제외된 변수(대기질/자외선 실패 등) */
  excludedVariables: ScoreFactor[];
  /** 알고리즘 버전 (결정 003 #10, 예: "v1") */
  calcVersion: string;
  /** 계산 시각(ISO) */
  computedAt: string;
}

/** 조건별 장비 추천 1건 (PRD 4.2 규칙 엔진 산출, Task 024) */
export interface GearItem {
  id: string;
  /** 장비명(예: "방수 자켓") */
  name: string;
  /** 추천 근거 문구(예: "강수확률 70%") */
  reason: string;
  /** 발동 변수 */
  trigger: ScoreFactor;
}
