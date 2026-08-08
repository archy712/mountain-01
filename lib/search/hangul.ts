/**
 * 한글 초성 유틸 (Task 018) — 프레임워크 무의존 순수 함수.
 *
 * 자동완성에서 "ㅂㅎㅅ" 같은 초성 입력으로 "북한산"을 찾기 위해 쓴다.
 * 한글 음절(가~힣, U+AC00~U+D7A3)은 (초성 19 × 중성 21 × 종성 28) 구조라
 * 음절 코드에서 초성 인덱스를 `floor((code-0xAC00)/588)` 로 얻는다.
 */

/** 초성 19자(유니코드 음절 초성 순서 = 호환 자모 배열 순서와 동일). */
const CHOSUNG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

const HANGUL_SYLLABLE_BASE = 0xac00;
const HANGUL_SYLLABLE_LAST = 0xd7a3;
const CHOSUNG_DIVISOR = 588; // 21 * 28

const CHOSUNG_SET = new Set<string>(CHOSUNG);

/**
 * 문자열의 초성 시퀀스를 만든다.
 * - 한글 음절: 초성으로 치환
 * - 이미 초성(호환 자모): 그대로 유지
 * - 그 외 문자: 그대로 유지(공백·영문 등)
 */
export function getChosung(str: string): string {
  let out = "";
  for (const ch of str) {
    const code = ch.codePointAt(0)!;
    if (code >= HANGUL_SYLLABLE_BASE && code <= HANGUL_SYLLABLE_LAST) {
      out += CHOSUNG[Math.floor((code - HANGUL_SYLLABLE_BASE) / CHOSUNG_DIVISOR)];
    } else {
      out += ch;
    }
  }
  return out;
}

/** 문자열이 (공백 제외) 전부 초성 자모로만 이루어졌는지. 빈 문자열은 false. */
export function isChosungQuery(str: string): boolean {
  const chars = [...str].filter((c) => c.trim() !== "");
  if (chars.length === 0) return false;
  return chars.every((c) => CHOSUNG_SET.has(c));
}
