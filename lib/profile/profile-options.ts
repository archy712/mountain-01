/**
 * 프로필 편집 옵션 상수 (마이페이지 프로필). 클라이언트·서버 공용.
 *
 * 아바타는 이미지 업로드/URL 대신 **프리셋 아이콘(이모지) 선택** 방식이다(사용자 결정).
 * 저장은 이모지 문자열을 `profiles.avatar_icon` 에 그대로 넣고, 표시 시 그 문자를 렌더한다.
 * 없으면 이름 이니셜로 폴백한다. 허용 집합은 이 목록으로 클라이언트에서 제한한다.
 */

/** 선택 가능한 프로필 아이콘(등산·자연 테마). value 는 저장·표시에 쓰는 이모지 문자. */
export const AVATAR_ICONS: { icon: string; label: string }[] = [
  { icon: "🥾", label: "등산화" },
  { icon: "⛰️", label: "산" },
  { icon: "🏔️", label: "설산" },
  { icon: "🧭", label: "나침반" },
  { icon: "🎒", label: "배낭" },
  { icon: "🏕️", label: "캠프" },
  { icon: "🌲", label: "숲" },
  { icon: "🌄", label: "일출" },
  { icon: "🍂", label: "단풍" },
  { icon: "🦅", label: "독수리" },
  { icon: "🐻", label: "곰" },
  { icon: "☀️", label: "맑음" },
];

const AVATAR_ICON_SET = new Set(AVATAR_ICONS.map((a) => a.icon));

/** 저장/표시 전 허용된 아이콘인지 검증. 목록 밖 값은 null(이니셜 폴백)로 취급. */
export function normalizeAvatarIcon(value: string | null | undefined): string | null {
  return value && AVATAR_ICON_SET.has(value) ? value : null;
}

/** 등산 경력 수준(선택). DB CHECK 제약과 값이 일치해야 한다. */
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "입문 (가벼운 근교 산행)" },
  { value: "intermediate", label: "중급 (당일 종주·명산)" },
  { value: "advanced", label: "고급 (장거리·고산·악천후)" },
];

const EXPERIENCE_VALUE_SET = new Set<string>(EXPERIENCE_LEVELS.map((e) => e.value));

export function isExperienceLevel(value: string): value is ExperienceLevel {
  return EXPERIENCE_VALUE_SET.has(value);
}

/** 등산 경력 코드 → 한국어 짧은 라벨(마이페이지 표시용). */
export const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = {
  beginner: "입문",
  intermediate: "중급",
  advanced: "고급",
};

/** 자기소개 최대 길이(글자). UI 카운터·서버 저장 공통 기준. */
export const BIO_MAX_LENGTH = 160;
