/**
 * 컨디션 점수·장비 추천 도메인 타입 (결정 003 #10·#11, PRD 4.2 v1).
 * 점수 계산은 서버 유틸에서만 수행하고 `calcVersion` 으로 태깅한다(Task 023).
 */

import type { AirQuality, UvIndex } from "./air";

/** 점수 감점/추천에 관여하는 입력 변수 */
export type ScoreFactor = "pop" | "pty" | "temp" | "wind" | "air" | "uv" | "fire";

export const SCORE_FACTOR_LABEL: Record<ScoreFactor, string> = {
  pop: "강수확률",
  pty: "강수형태",
  temp: "기온",
  wind: "풍속",
  air: "미세먼지",
  uv: "자외선",
  fire: "산불위험",
};

/**
 * 산불위험 등급 (산림청 국립산림과학원 산불위험예보정보, Task 043).
 * 지수 1~100 → 4단계: 낮음(≤50) / 다소 높음(51~65) / 높음(66~85) / 매우 높음(86+).
 */
export type FireLevel = "low" | "moderate" | "high" | "very-high";

export const FIRE_LEVEL_LABEL: Record<FireLevel, string> = {
  low: "낮음",
  moderate: "다소 높음",
  high: "높음",
  "very-high": "매우 높음",
};

/** 산불위험 정보 1건(시도 단위 대표값, Task 043). */
export interface FireRisk {
  /** 대표 위험지수(시도 평균, 0~100) */
  index: number;
  /** 등급(색상 단독 금지 원칙: 항상 라벨 병기) */
  level: FireLevel;
  /** 시도명 원문(예: "강원특별자치도") */
  regionName: string;
  /** 분석일시 원문(예: "2026-08-10 10") */
  analdate: string;
}

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

/**
 * 요인 상태 (Task 041 후속, 점수 근거 UI 확장).
 * good: 감점 0(양호) / caution: 감점 있음(유의) / excluded: 데이터 결측으로 계산 제외.
 */
export type FactorStatus = "good" | "caution" | "excluded";

/**
 * 요인별 종합 평가 1건 — "왜 이 점수인지"를 좋은 요인까지 포함해 전부 보여주기 위한 표시용 모델.
 * 감점된 요인만 나열하던 breakdown 과 달리, 6개 입력을 5개 표시 요인(강수확률·강수형태는 '강수'로
 * 병합)으로 정리해 좋은 날에도 근거가 알차게 채워지게 한다. 계산 로직은 점수 엔진을 그대로 재사용한다.
 */
export interface ScoreFactorAssessment {
  factor: ScoreFactor;
  /** 요인 라벨(예: "기온", "강수", "미세먼지") */
  label: string;
  /** 현재 값 표기(예: "27℃", "20%", "3.9㎧", "좋음", "6", "정보 없음") */
  valueText: string;
  /** 짧은 질적 코멘트(예: "한낮 다소 높음", "걱정 없음", "잔잔함") */
  note: string;
  status: FactorStatus;
  /** 감점(양수 magnitude, good/excluded 이면 0) */
  penalty: number;
  /** 이 요인의 최대 감점(막대 정규화용) */
  maxPenalty: number;
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

/**
 * 시간대별 컨디션 1건 (Task 039). 단기예보의 각 시각 슬롯을 컨디션 점수로 환산한 값.
 * "오늘 언제 가면 좋은지"를 판단시키기 위한 추이의 한 점이다.
 */
export interface HourlyConditionPoint {
  /** 예보 일자(YYYYMMDD) */
  date: string;
  /** 예보 시각(HHmm, 정시) */
  time: string;
  /** 0~100 컨디션 점수 */
  score: number;
  grade: ScoreGrade;
  /**
   * 이 시각에 출발하면 일몰 전 하산이 가능한지(긴 코스 왕복시간+버퍼 기준, Task 039 후속).
   * 안전 출발 데이터(소요시간·일몰)가 없으면 제약 없음으로 true.
   */
  daylightSafe: boolean;
}

/**
 * 안전 출발 안내 (Task 039 후속). 긴 코스 왕복시간과 일몰로 "언제까지 출발해야 일몰 전
 * 하산하는지"를 계산한다. 공식 입산통제 시각 데이터는 없어 일몰 기준으로 파생한다.
 */
export interface DaylightGuidance {
  /** 참조 왕복 소요(분) — 개방 코스 왕복시간의 상위 80퍼센타일("긴 코스") */
  roundTripMin: number;
  /** 오늘 일몰 KST "HH:MM" */
  sunsetLabel: string;
  /** 일몰 전 하산하려면 늦어도 출발해야 하는 시각 "HH:MM" */
  latestStartLabel: string;
  /** 표시된 오늘 시간대 중 안전한 출발 슬롯이 하나도 없으면 true(이미 늦음) */
  allTooLate: boolean;
  /**
   * 왕복시간이 실제 코스 데이터가 아니라 **기본 추정치**인지 여부(국립공원 외 산 등
   * 코스 소요시간 미보유). true 면 "긴 코스" 대신 "일반 산행 기준"으로 안내한다.
   */
  estimated: boolean;
}

/**
 * 시간대별 컨디션 추이 (Task 039). 앞으로의 슬롯별 점수 목록과 가장 좋은 지점을 담는다.
 * 동일 단기예보 응답 하나(추가 네트워크 없음)에서 파생한다.
 */
export interface HourlyConditionTrend {
  /** 시각 순 정렬된 슬롯별 컨디션 점수 */
  points: HourlyConditionPoint[];
  /** 가장 점수가 높은 지점의 index(동점이면 이른 시각). points 가 비면 -1 */
  bestIndex: number;
  /** 안전 출발 안내(왕복시간·일몰 기반). 계산 불가(코스 소요시간 부족 등) 시 null */
  daylight: DaylightGuidance | null;
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

/**
 * 컨디션 점수 + 장비 추천 묶음 (Task 024).
 * 동일 날씨·대기·자외선 입력으로 함께 산출되므로 한 번의 소스 조회로 반환한다.
 * 점수 계산에 쓰인 대기질·자외선 원값도 함께 실어, 상세 화면이 감점 근거를 실제
 * 수치(PM10·PM2.5·UV 지수)로 보여줄 수 있게 한다. 해당 소스가 실패/미매핑이면 null.
 */
export interface ConditionBundle {
  score: ConditionScore;
  gear: GearItem[];
  /** 점수 산출에 쓰인 대기질 원값(측정소 미매핑·조회 실패 시 null) */
  air: AirQuality | null;
  /** 점수 산출에 쓰인 자외선 원값(조회 실패 시 null) */
  uv: UvIndex | null;
  /** 점수 산출에 쓰인 산불위험 원값(미커버·조회 실패 시 null, Task 043) */
  fire: FireRisk | null;
  /** 요인별 종합 평가(좋은 요인 포함 전체) — 점수 근거 UI 용 */
  factors: ScoreFactorAssessment[];
}
