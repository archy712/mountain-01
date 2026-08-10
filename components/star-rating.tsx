"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 별점 표시·입력 컴포넌트 (Task 048).
 *
 * **색상 단독 금지** 원칙: 별 모양(채움/빈칸)이 1차 신호이고, 표시형은 숫자 라벨을,
 * 입력형은 "N점" 텍스트와 `aria-label` 을 항상 병기한다. 색맹 사용자도 채움 비율과
 * 숫자로 값을 읽을 수 있다.
 */

/** 표시형 별 크기 → tailwind 클래스. */
const SIZE_CLASS = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const;

/**
 * 읽기 전용 별점(소수 지원). 빈 별 위에 채운 별을 `value/5` 폭으로 클리핑해 4.3 같은
 * 소수도 정확히 시각화한다. 스크린리더에는 "5점 만점에 N점"으로 읽힌다.
 */
export function StarRating({
  value,
  size = "md",
  showValue = true,
  count,
  className,
}: {
  /** 별점(0~5, 소수 허용) */
  value: number;
  size?: keyof typeof SIZE_CLASS;
  /** 숫자 라벨 병기 여부 */
  showValue?: boolean;
  /** 후기 수(있으면 "(N)" 병기) */
  count?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const pct = (clamped / 5) * 100;
  const starClass = SIZE_CLASS[size];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={`5점 만점에 ${clamped.toFixed(1)}점${count != null ? `, 후기 ${count}개` : ""}`}
    >
      <span className="relative inline-flex" aria-hidden="true">
        <span className="flex">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              className={cn(starClass, "text-muted-foreground/30")}
              fill="currentColor"
            />
          ))}
        </span>
        <span className="absolute inset-0 flex overflow-hidden" style={{ width: `${pct}%` }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              className={cn(starClass, "shrink-0 text-amber-500")}
              fill="currentColor"
            />
          ))}
        </span>
      </span>
      {showValue ? (
        <span className="text-sm font-semibold tabular-nums">{clamped.toFixed(1)}</span>
      ) : null}
      {count != null ? <span className="text-xs text-muted-foreground">({count})</span> : null}
    </span>
  );
}

/**
 * 별점 입력(1~5 정수). 라디오 그룹 시맨틱 + 좌우 화살표 키보드 조작. 각 별은 44px 이상
 * 터치 타깃을 확보한다. 선택 값은 "N점" 텍스트로 병기한다.
 */
export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  className,
}: {
  /** 현재 선택 별점(0 = 미선택) */
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  function handleKey(e: React.KeyboardEvent, n: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(5, n + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(1, n - 1));
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="별점 선택(필수)"
      className={cn("flex items-center gap-1", className)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}점`}
          tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(n)}
          onKeyDown={(e) => handleKey(e, n)}
          className="flex size-11 items-center justify-center rounded-md transition-colors hover:bg-accent disabled:opacity-60"
        >
          <Star
            className={cn("size-7", n <= shown ? "text-amber-500" : "text-muted-foreground/40")}
            fill={n <= shown ? "currentColor" : "none"}
          />
        </button>
      ))}
      <span
        className={cn(
          "ml-1 text-sm tabular-nums",
          value ? "font-medium text-foreground" : "text-muted-foreground",
        )}
        aria-live="polite"
      >
        {value ? `${value}점` : "별점을 선택하세요"}
      </span>
    </div>
  );
}
