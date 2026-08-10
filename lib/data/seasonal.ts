/**
 * 계절 명소·야생동물 주의 큐레이션 콘텐츠 (Task 046) — 정적·자체 큐레이션.
 *
 * 외부 API 없이 **산×시즌×기간**을 코드에 동결한 정적 데이터다. 상세 화면은 오늘(KST)이
 * 각 항목의 기간에 들면 안내를 노출하고, 그 외/미보유 산은 섹션을 감춘다(기간 판정은
 * Task 046 2단계 `lib/seasonal/period.ts` 가 수행).
 *
 * ## 키를 산 id(uuid)로 잡는 이유
 * 로스터에 **동명 산**이 있다(지리산 2곳·백운산·남산). 이름 키는 지리산(전남·경남, 반달곰·
 * 설경 대상)과 지리산(경남, 소형)을 구분하지 못하므로, 고유 불변 키인 `mountains.id`(결정론적
 * uuidv5)로 매핑한다. 각 항목에 산 이름·지역 주석을 달아 가독성을 보완한다.
 *
 * ## 기간 표기
 * `SeasonalPeriod`(월/일, 연말 wrap 지원)를 `lib/trails/seasonal-closure.ts` 에서 재사용한다.
 * 절정 시기는 지역·고도로 대략 달라 **보수적 근사 구간**으로 둔다(정확한 해별 절정은 표기 목적상 불필요).
 */

import type { SeasonalPeriod } from "@/lib/trails/seasonal-closure";

/** 계절 명소 유형 → 아이콘/기본 라벨은 표현 컴포넌트가 매핑. */
export type SeasonHighlightType =
  | "foliage" // 단풍
  | "snow" // 설경·상고대
  | "azalea" // 진달래·철쭉
  | "silver-grass"; // 억새

/** 야생동물 주의 유형(팩트 기반만 큐레이션). */
export type WildlifeType = "bear"; // 반달가슴곰(지리산·덕유산 복원지)

export interface SeasonalHighlight {
  type: SeasonHighlightType;
  /** 표시 라벨(예: "단풍 절정", "상고대·설경"). */
  label: string;
  /** 활성 기간(오늘이 이 안이면 노출). 연말 wrap(설경 12~2월) 지원. */
  period: SeasonalPeriod;
  /** 짧은 부가 안내(선택). */
  note?: string;
}

export interface WildlifeCaution {
  type: WildlifeType;
  /** 표시 라벨(예: "반달가슴곰 서식지"). */
  label: string;
  /** 주의 강조 기간(활동기). 생략 시 상시 노출. */
  period?: SeasonalPeriod;
  /** 짧은 부가 안내(선택). */
  note?: string;
}

export interface MountainSeasonalContent {
  highlights: SeasonalHighlight[];
  cautions: WildlifeCaution[];
}

/** `{startMonth, startDay, endMonth, endDay}` 축약 생성자(큐레이션 가독성용). */
function p(startMonth: number, startDay: number, endMonth: number, endDay: number): SeasonalPeriod {
  return { startMonth, startDay, endMonth, endDay };
}

// ── 재사용 기간 상수 ──
/** 설경·상고대: 한겨울(연말 wrap). 고산·북부 대상. */
const SNOW = p(12, 15, 2, 20);
/** 억새: 가을 절정(10월). 영남알프스·명성산 등. */
const SILVER_GRASS = p(10, 1, 10, 31);

/**
 * 산 id(uuid) → 큐레이션 콘텐츠. 대상 외 산은 **미포함**(상세에서 섹션 미노출).
 * 단풍 기간은 위도·고도로 북 → 남, 고 → 저 순으로 늦어지는 경향을 반영해 보수적으로 근사한다.
 */
export const SEASONAL_CONTENT: Record<string, MountainSeasonalContent> = {
  // 설악산(강원, 1708m) — 전국에서 단풍이 가장 빠른 축, 겨울 설경 명소.
  "1a107970-ee4a-5dcd-9351-1373a067627d": {
    highlights: [
      { type: "foliage", label: "단풍 절정", period: p(10, 5, 10, 25) },
      { type: "snow", label: "설경·상고대", period: SNOW },
    ],
    cautions: [],
  },
  // 오대산(강원, 1565m) — 고산 단풍·겨울 설경.
  "cf6f3bff-497a-5656-b3f9-d9684a0f8cae": {
    highlights: [
      { type: "foliage", label: "단풍 절정", period: p(10, 8, 10, 28) },
      { type: "snow", label: "설경", period: SNOW },
    ],
    cautions: [],
  },
  // 태백산(강원, 1567m) — 눈꽃·상고대 대표(눈축제), 봄 설경까지.
  "32d7b205-b97f-5c07-ac52-99ec0b57814c": {
    highlights: [{ type: "snow", label: "눈꽃·상고대", period: SNOW }],
    cautions: [],
  },
  // 소백산(충북·경북, 1439m) — 겨울 칼바람 상고대, 초여름 연화봉 철쭉.
  "086f9a74-129c-5b6a-ad6c-f3a240f2077c": {
    highlights: [
      { type: "snow", label: "설경·상고대", period: SNOW },
      { type: "azalea", label: "철쭉", period: p(5, 25, 6, 10) },
    ],
    cautions: [],
  },
  // 속리산(충북·경북, 1058m) — 가을 단풍.
  "7f214088-423a-5bba-a637-ba77a647b628": {
    highlights: [{ type: "foliage", label: "단풍 절정", period: p(10, 20, 11, 5) }],
    cautions: [],
  },
  // 월악산(충북, 1097m) — 가을 단풍.
  "dd507142-506a-5687-b8ae-e0b2015247b7": {
    highlights: [{ type: "foliage", label: "단풍 절정", period: p(10, 20, 11, 5) }],
    cautions: [],
  },
  // 계룡산(대전·충남, 845m) — 가을 단풍.
  "1e1a8656-1216-54ae-9db1-72163485a340": {
    highlights: [{ type: "foliage", label: "단풍 절정", period: p(10, 25, 11, 8) }],
    cautions: [],
  },
  // 주왕산(경북, 720m) — 주산지·주왕계곡 가을 단풍.
  "16aa04a6-b3b3-5d78-b7f1-c977ef4ef3e4": {
    highlights: [{ type: "foliage", label: "단풍 절정", period: p(10, 25, 11, 10) }],
    cautions: [],
  },
  // 내장산(전북, 763m) — 국내 단풍 대표 명소.
  "79b8d19d-af3c-54e2-b8e4-6e9eed6443da": {
    highlights: [
      {
        type: "foliage",
        label: "단풍 절정",
        period: p(10, 25, 11, 15),
        note: "국내 대표 단풍 명소",
      },
    ],
    cautions: [],
  },
  // 무등산(광주·전남, 1187m) — 가을 단풍, 겨울 상고대.
  "8c82d52f-057f-5397-866e-492646d9e26e": {
    highlights: [
      { type: "foliage", label: "단풍 절정", period: p(10, 25, 11, 10) },
      { type: "snow", label: "상고대", period: SNOW },
    ],
    cautions: [],
  },
  // 두륜산(전남, 700m) — 남부라 단풍이 가장 늦은 편.
  "11706311-002c-54dc-97d8-e05ce18c3937": {
    highlights: [{ type: "foliage", label: "단풍 절정", period: p(11, 1, 11, 20) }],
    cautions: [],
  },
  // 대둔산(전북·충남, 878m) — 가을 단풍(기암·구름다리).
  "22b0fbd6-a112-5a71-8c32-fa85c63ec1bc": {
    highlights: [{ type: "foliage", label: "단풍 절정", period: p(10, 20, 11, 5) }],
    cautions: [],
  },
  // 가야산(경남·경북, 1433m) — 가을 단풍.
  "2c082588-e855-5597-8730-cd5d43373424": {
    highlights: [{ type: "foliage", label: "단풍 절정", period: p(10, 20, 11, 5) }],
    cautions: [],
  },
  // 지리산(전남·경남, 1915m) — 피아골 단풍·겨울 설경, 반달가슴곰 복원 핵심지.
  "7caf3f2f-fc5a-554a-9c0c-ecb8211b73e6": {
    highlights: [
      { type: "foliage", label: "단풍 절정", period: p(10, 20, 11, 5) },
      { type: "snow", label: "설경·상고대", period: SNOW },
      { type: "azalea", label: "바래봉·세석 철쭉", period: p(5, 10, 6, 5) },
    ],
    cautions: [
      {
        type: "bear",
        label: "반달가슴곰 서식지",
        period: p(3, 15, 11, 30),
        note: "복원 지역 — 지정 탐방로 이용, 음식물 관리 주의",
      },
    ],
  },
  // 덕유산(전북·경남, 1614m) — 상고대·설경 명소, 반달가슴곰 서식 확장 지역.
  "5d4b8638-93ec-55f2-8bbc-e92c617fdef3": {
    highlights: [{ type: "snow", label: "상고대·설경", period: SNOW }],
    cautions: [
      {
        type: "bear",
        label: "반달가슴곰 서식지",
        period: p(3, 15, 11, 30),
        note: "지정 탐방로 이용, 음식물 관리 주의",
      },
    ],
  },
  // 한라산(제주, 1947m) — 겨울 설경(백록담 설경).
  "7728f31a-24f8-52f6-8067-eba56305c910": {
    highlights: [{ type: "snow", label: "설경", period: SNOW }],
    cautions: [],
  },
  // 황매산(경남, 1113m) — 철쭉 대표 명소, 가을 억새.
  "3ec5b2da-2cbd-5a84-b767-1acfa0333f65": {
    highlights: [
      { type: "azalea", label: "철쭉 군락", period: p(4, 25, 5, 15), note: "철쭉 대표 명소" },
      { type: "silver-grass", label: "억새", period: SILVER_GRASS },
    ],
    cautions: [],
  },
  // 신불산(울산, 1159m) — 영남알프스 억새.
  "5a6e492e-8098-590e-986a-bd71e62a6795": {
    highlights: [{ type: "silver-grass", label: "억새", period: SILVER_GRASS }],
    cautions: [],
  },
  // 재약산(경남·울산, 1119m) — 사자평 억새.
  "a6df16f4-41b5-5c67-a535-71ee57d69277": {
    highlights: [{ type: "silver-grass", label: "사자평 억새", period: SILVER_GRASS }],
    cautions: [],
  },
  // 명성산(강원·경기, 922m) — 억새 축제.
  "1e5146ee-1343-5cf3-a7ab-fbc00cb2d22a": {
    highlights: [{ type: "silver-grass", label: "억새", period: SILVER_GRASS }],
    cautions: [],
  },
  // 화왕산(경남, 758m) — 억새 군락.
  "268d5b5b-78ab-596e-8b69-8bafd070b1e8": {
    highlights: [{ type: "silver-grass", label: "억새 군락", period: SILVER_GRASS }],
    cautions: [],
  },
};

/** 큐레이션된 산 id 집합(참조·테스트용). */
export const SEASONAL_CONTENT_IDS = Object.keys(SEASONAL_CONTENT);
