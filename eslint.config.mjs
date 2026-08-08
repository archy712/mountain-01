import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const eslintConfig = [
  // 무시 대상 (빌드 산출물, 자동 생성 파일)
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
      "lib/supabase/database.types.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  // Prettier와 충돌하는 포매팅 규칙 비활성화 (반드시 마지막에 위치)
  eslintConfigPrettier,
];

export default eslintConfig;
