import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // 탐방로 상태색 (Task 008) — 아이콘·텍스트 병기 전제
        status: {
          open: "hsl(var(--status-open))",
          closed: "hsl(var(--status-closed))",
          partial: "hsl(var(--status-partial))",
          unknown: "hsl(var(--status-unknown))",
        },
        // 컨디션 점수 등급색 (Task 008)
        grade: {
          excellent: "hsl(var(--grade-excellent))",
          good: "hsl(var(--grade-good))",
          fair: "hsl(var(--grade-fair))",
          poor: "hsl(var(--grade-poor))",
          dangerous: "hsl(var(--grade-dangerous))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // 섹션 스트리밍 대기용 무한 진행바 (Task 034) — 실제 진행률을 알 수 없는
      // 서버 스트리밍이라 가짜 퍼센트 대신 스윕만 반복해 "불러오는 중"을 전달한다.
      keyframes: {
        "indeterminate-progress": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(250%)" },
        },
      },
      animation: {
        "indeterminate-progress": "indeterminate-progress 1.15s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
