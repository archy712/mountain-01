/**
 * 산·탐방로 더미 데이터 (Phase 2 UI 전용, Task 008).
 *
 * Task 006 도메인 타입(`Mountain`, `Trail`)을 준수한다. 외부 API·DB 연동 전까지
 * 홈/검색·상세 화면(Task 009~012)이 이 데이터만으로 전 화면을 완성한다.
 * 격자 좌표(`gridNx`/`gridNy`)는 시드 적재(결정 002 #7) 전 근사값이다.
 */

import type { Mountain, Trail } from "@/lib/types";

export const MOCK_MOUNTAINS: Mountain[] = [
  {
    id: "bukhansan",
    name: "북한산",
    region: "서울·경기",
    altitude: 836,
    lat: 37.6586,
    lng: 126.9779,
    gridNx: 60,
    gridNy: 127,
  },
  {
    id: "seoraksan",
    name: "설악산",
    region: "강원",
    altitude: 1708,
    lat: 38.1194,
    lng: 128.4655,
    gridNx: 87,
    gridNy: 141,
  },
  {
    id: "jirisan",
    name: "지리산",
    region: "전남·경남",
    altitude: 1915,
    lat: 35.3372,
    lng: 127.7305,
    gridNx: 76,
    gridNy: 78,
  },
  {
    id: "hallasan",
    name: "한라산",
    region: "제주",
    altitude: 1947,
    lat: 33.3617,
    lng: 126.5292,
    gridNx: 53,
    gridNy: 38,
  },
  {
    id: "gwanaksan",
    name: "관악산",
    region: "서울·경기",
    altitude: 632,
    lat: 37.4426,
    lng: 126.9636,
    gridNx: 59,
    gridNy: 125,
  },
  {
    id: "taebaeksan",
    name: "태백산",
    region: "강원",
    altitude: 1567,
    lat: 37.0966,
    lng: 128.9159,
    gridNx: 95,
    gridNy: 88,
  },
];

/** 산별 탐방로 목록 (개방/통제/부분통제/정보없음 케이스를 UI 검증용으로 고루 포함) */
export const MOCK_TRAILS: Record<string, Trail[]> = {
  bukhansan: [
    {
      id: "bukhansan-1",
      mountainId: "bukhansan",
      name: "우이동 코스",
      status: "open",
      closedReason: null,
      closedPeriod: null,
      distanceM: 3200,
      difficulty: 2.1,
      goMinutes: 95,
      comeMinutes: 75,
      waypoints: "우이동~하루재~백운대",
      hasPath: true,
    },
    {
      id: "bukhansan-2",
      mountainId: "bukhansan",
      name: "백운대 코스",
      status: "partial",
      closedReason: "낙석 위험 구간 우회",
      closedPeriod: null,
      distanceM: 2600,
      difficulty: 2.5,
      goMinutes: 80,
      comeMinutes: 60,
      waypoints: "산성탐방지원센터~백운봉암문~백운대",
      hasPath: true,
    },
    {
      id: "bukhansan-3",
      mountainId: "bukhansan",
      name: "산성 코스",
      status: "open",
      closedReason: null,
      closedPeriod: null,
      distanceM: 4100,
      difficulty: 1.8,
      goMinutes: 120,
      comeMinutes: 100,
      waypoints: null,
      hasPath: true,
    },
  ],
  seoraksan: [
    {
      id: "seoraksan-1",
      mountainId: "seoraksan",
      name: "오색 코스",
      status: "closed",
      closedReason: "산불 조심 기간 입산 통제",
      closedPeriod: "11월 1일~12월 15일",
      distanceM: 5000,
      difficulty: 3.1,
      goMinutes: 240,
      comeMinutes: 180,
      waypoints: "오색~설악폭포~대청봉",
      hasPath: true,
    },
    {
      id: "seoraksan-2",
      mountainId: "seoraksan",
      name: "천불동 계곡 코스",
      status: "open",
      closedReason: null,
      closedPeriod: null,
      distanceM: 7300,
      difficulty: 2.6,
      goMinutes: 300,
      comeMinutes: 240,
      waypoints: null,
      hasPath: true,
    },
  ],
  jirisan: [
    {
      id: "jirisan-1",
      mountainId: "jirisan",
      name: "성삼재~노고단 코스",
      status: "open",
      closedReason: null,
      closedPeriod: null,
      distanceM: 4740,
      difficulty: 1.6,
      goMinutes: 158,
      comeMinutes: 158,
      waypoints: null,
      hasPath: true,
    },
    {
      id: "jirisan-2",
      mountainId: "jirisan",
      name: "중산리 코스",
      status: "partial",
      closedReason: "정비 공사 구간 통제",
      closedPeriod: "3월 1일~4월 30일",
      distanceM: 5400,
      difficulty: 2.7,
      goMinutes: 181,
      comeMinutes: 181,
      waypoints: null,
      hasPath: true,
    },
  ],
  hallasan: [
    {
      id: "hallasan-1",
      mountainId: "hallasan",
      name: "성판악 코스",
      status: "open",
      closedReason: null,
      closedPeriod: null,
      distanceM: 9600,
      difficulty: null,
      goMinutes: 270,
      comeMinutes: 240,
      waypoints: "성판악~진달래밭~정상(동능)",
      hasPath: true,
    },
    {
      id: "hallasan-2",
      mountainId: "hallasan",
      name: "관음사 코스",
      status: "open",
      closedReason: null,
      closedPeriod: null,
      distanceM: 8700,
      difficulty: null,
      goMinutes: 300,
      comeMinutes: 270,
      waypoints: null,
      hasPath: true,
    },
  ],
  gwanaksan: [
    {
      id: "gwanaksan-1",
      mountainId: "gwanaksan",
      name: "서울대 코스",
      status: "open",
      closedReason: null,
      closedPeriod: null,
      distanceM: 3000,
      difficulty: 2.0,
      goMinutes: 90,
      comeMinutes: 70,
      waypoints: null,
      hasPath: true,
    },
    {
      id: "gwanaksan-2",
      mountainId: "gwanaksan",
      name: "과천 향교 코스",
      status: "open",
      closedReason: null,
      closedPeriod: null,
      distanceM: 2500,
      difficulty: 1.9,
      goMinutes: 80,
      comeMinutes: 60,
      waypoints: null,
      hasPath: true,
    },
  ],
  // 국립공원 외 커버리지 밖 케이스(결정 001 #4): 탐방로 정보 없음
  taebaeksan: [
    {
      id: "taebaeksan-1",
      mountainId: "taebaeksan",
      name: "유일사 코스",
      status: "unknown",
      closedReason: null,
      closedPeriod: null,
      distanceM: null,
      difficulty: null,
      goMinutes: null,
      comeMinutes: null,
      waypoints: null,
      hasPath: true,
    },
  ],
};

/** id 로 산 조회 */
export function getMountainById(id: string): Mountain | undefined {
  return MOCK_MOUNTAINS.find((m) => m.id === id);
}

/** 산 id 로 탐방로 목록 조회 */
export function getTrailsByMountainId(mountainId: string): Trail[] {
  return MOCK_TRAILS[mountainId] ?? [];
}

/** 이름 부분 일치 검색(자동완성용). 빈 질의는 빈 배열. */
export function searchMountains(query: string): Mountain[] {
  const q = query.trim();
  if (q === "") return [];
  return MOCK_MOUNTAINS.filter((m) => m.name.includes(q) || m.region.includes(q));
}

/** 인기 산 목록(홈 화면 카드 그리드용) */
export const POPULAR_MOUNTAINS: Mountain[] = MOCK_MOUNTAINS.slice(0, 4);
