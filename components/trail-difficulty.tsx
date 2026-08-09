import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { DIFFICULTY_LEVEL_LABEL, trailDifficultyLevel, type DifficultyLevel } from "@/lib/types";

/**
 * 탐방로 난이도 별점 표시 (Task 034, 상세 정보 확장).
 *
 * **오름 소요시간(goMinutes)** 기준 난이도를 별 5개 스케일(채워진 별 = 난이도)로 시각화하고,
 * 색상(쉬움 초록 → 어려움 적색)과 텍스트 라벨을 함께 병기한다(색상 단독 금지 원칙). KNPS
 * 난이도 지수 대신 소요시간을 쓰는 이유는 `trailDifficultyLevel` 주석 참고(거리 미반영 문제).
 * 소요시간 정보가 없는 코스는 별 대신 "난이도 정보 없음"을 흐리게 노출한다. 색상은 컨디션
 * 등급 토큰(`--grade-*`)을 의미 매핑해 재사용한다.
 */

const DIFFICULTY_TONE: Record<DifficultyLevel, string> = {
  1: "text-grade-excellent",
  2: "text-grade-good",
  3: "text-grade-fair",
  4: "text-grade-poor",
  5: "text-grade-dangerous",
};

const STARS: DifficultyLevel[] = [1, 2, 3, 4, 5];

export function TrailDifficulty({
  goMinutes,
  className,
}: {
  goMinutes: number | null;
  className?: string;
}) {
  const level = trailDifficultyLevel(goMinutes);

  if (level === null) {
    return (
      <span
        className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground/70", className)}
      >
        난이도 정보 없음
      </span>
    );
  }

  const label = DIFFICULTY_LEVEL_LABEL[level];
  const tone = DIFFICULTY_TONE[level];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={`난이도 ${label} (5단계 중 ${level}단계)`}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {STARS.map((i) => (
          <Star
            key={i}
            className={cn(
              "size-3.5",
              i <= level ? cn(tone, "fill-current") : "text-muted-foreground/25",
            )}
          />
        ))}
      </span>
      <span className={cn("text-xs font-medium", tone)}>{label}</span>
    </span>
  );
}
