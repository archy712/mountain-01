import { Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { UV_GRADE_LABEL, type UvGrade, type UvIndex } from "@/lib/types";

/**
 * 자외선 지수 배지 (Task 011).
 *
 * UV 지수 값 + 구간 등급을 **텍스트 병기**로 노출한다(색상 단독 금지).
 * 등급색은 컨디션 등급 토큰(`--grade-*`)을 의미 매핑해 재사용한다(낮음=녹색 … 위험=적색).
 */

// UvGrade → 등급 색상 톤 (Tailwind JIT 스캔을 위해 완전한 클래스 문자열로 명시)
const UV_TONE_CLASS: Record<UvGrade, string> = {
  low: "border-grade-excellent/30 bg-grade-excellent/10 text-grade-excellent",
  moderate: "border-grade-good/30 bg-grade-good/10 text-grade-good",
  high: "border-grade-fair/30 bg-grade-fair/10 text-grade-fair",
  "very-high": "border-grade-poor/30 bg-grade-poor/10 text-grade-poor",
  extreme: "border-grade-dangerous/30 bg-grade-dangerous/10 text-grade-dangerous",
};

export function UvIndexBadge({ uv, className }: { uv: UvIndex; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        UV_TONE_CLASS[uv.grade],
        className,
      )}
    >
      <Sun className="size-3.5" aria-hidden="true" />
      <span className="opacity-80">자외선</span>
      <span className="tabular-nums">
        {uv.value} · {UV_GRADE_LABEL[uv.grade]}
      </span>
    </div>
  );
}
