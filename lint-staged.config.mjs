/**
 * lint-staged: git 스테이징된 파일에만 검사/포맷을 적용해 커밋 속도를 유지합니다.
 * - 타입 체크(tsc)는 프로젝트 전체를 대상으로 해야 하므로 파일 인자 없이 1회만 실행합니다.
 */
const config = {
  // TS/TSX: 전체 타입 체크 → ESLint 자동수정 → Prettier 포맷
  "*.{ts,tsx}": [() => "tsc --noEmit", "eslint --fix", "prettier --write"],
  // 그 외 포맷 대상 파일: Prettier만 적용
  "*.{js,jsx,mjs,cjs,json,jsonc,css,md,mdx,yml,yaml}": "prettier --write",
};

export default config;
