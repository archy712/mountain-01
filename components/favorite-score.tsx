import { connection } from "next/server";

import { getConditionForMountain, type ConditionMountainInput } from "@/lib/condition";
import { hasData, SCORE_GRADE_LABEL, type ScoreGrade } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 즐겨찾기 카드의 컨디션 점수 칩 — 카드별 독립 스트리밍 (즐겨찾기 로딩 UX 개선).
 *
 * 산 목록(이름·지역)은 DB 한 번으로 즉시 렌더하고, 각 산의 점수(외부 API: 날씨·대기·자외선)
 * 만 이 서버 컴포넌트가 `<Suspense>` 경계 안에서 **독립적으로** 산출한다. 한 산이 느려도
 * 리스트 전체·다른 카드는 막히지 않는다(`PartialResult` 가 실패도 격리). 상세 페이지의 섹션
 * 스트리밍과 동일한 패턴(`connection()` + 독립 Suspense)이다.
 */

const GRADE_CHIP: Record<ScoreGrade, string> = {
  excellent: "border-grade-excellent/30 bg-grade-excellent/10 text-grade-excellent",
  good: "border-grade-good/30 bg-grade-good/10 text-grade-good",
  fair: "border-grade-fair/30 bg-grade-fair/10 text-grade-fair",
  poor: "border-grade-poor/30 bg-grade-poor/10 text-grade-poor",
  dangerous: "border-grade-dangerous/30 bg-grade-dangerous/10 text-grade-dangerous",
};

/** 색상 단독 구분 금지: 점수 + 등급 텍스트 병기. 값 도착 시 부드럽게 등장(fade-in). */
function ScoreChip({ score, grade }: { score: number; grade: ScoreGrade }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        "animate-fade-in motion-reduce:animate-none",
        GRADE_CHIP[grade],
      )}
    >
      <span className="tabular-nums">{score}</span>
      <span>{SCORE_GRADE_LABEL[grade]}</span>
    </span>
  );
}

/**
 * 점수 산출 대기용 로딩 칩.
 *
 * 회색 블록 대신 **"확인 중" 라벨 + 시머 스윕**으로 무엇을 기다리는지 친절하게 전달한다.
 * - 접근성: `role="status"` + `aria-label` 로 스크린리더에도 로딩을 알린다(예전 aria-hidden 개선).
 * - 모션 축소: `prefers-reduced-motion` 에서 시머를 감춰 정적 라벨만 남긴다.
 * - CLS: 실제 칩과 동일 높이(h-[22px])·라운드·테두리를 유지해 값이 들어와도 밀리지 않는다.
 */
export function FavoriteScoreSkeleton() {
  return (
    <span
      role="status"
      aria-label="컨디션 점수 확인 중"
      className="relative inline-flex h-[22px] shrink-0 items-center overflow-hidden rounded-full border border-dashed border-border bg-muted/50 px-2 text-xs font-medium text-muted-foreground"
    >
      {/* 시머 하이라이트가 좌→우로 지나가며 진행감을 준다(모션 축소 시 숨김). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent motion-reduce:hidden"
      />
      <span className="relative">확인 중</span>
    </span>
  );
}

/** 산 하나의 컨디션 점수 칩을 스트리밍한다. 점수 계산 불가(날씨 실패 등)면 아무것도 렌더하지 않는다. */
export async function FavoriteScore({ mountain }: { mountain: ConditionMountainInput }) {
  await connection();
  const condition = await getConditionForMountain(mountain);
  if (!hasData(condition)) return null;
  const { score } = condition.data;
  return <ScoreChip score={score.score} grade={score.grade} />;
}
