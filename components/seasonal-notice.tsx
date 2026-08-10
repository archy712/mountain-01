import { Flower2, Leaf, PawPrint, Snowflake, Wheat, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SeasonHighlightType, WildlifeType } from "@/lib/data/seasonal";
import type { ActiveSeasonalContent } from "@/lib/seasonal/period";

/**
 * 계절 명소·야생동물 주의 안내 (Task 046).
 *
 * 오늘(KST) 활성인 시즌 명소(단풍·설경·철쭉·억새)를 정보 칩으로, 야생동물 주의(반달가슴곰
 * 서식지)를 경고 배너로 노출한다. 활성 항목은 상위(`getActiveSeasonalContent`)가 이미 걸러
 * 넘기므로, 이 컴포넌트는 표현만 담당한다(빈 데이터면 상위에서 섹션을 렌더하지 않음).
 *
 * 접근성(색상 단독 금지): 명소·주의 모두 **아이콘 + 텍스트 라벨**을 병기하고, 주의는 색상 톤
 * (`--grade-dangerous`)에 더해 경고 아이콘·굵은 라벨로 의미를 이중 전달한다.
 */

const HIGHLIGHT_ICON: Record<SeasonHighlightType, LucideIcon> = {
  foliage: Leaf, // 단풍
  snow: Snowflake, // 설경·상고대
  azalea: Flower2, // 진달래·철쭉
  "silver-grass": Wheat, // 억새
};

const CAUTION_ICON: Record<WildlifeType, LucideIcon> = {
  bear: PawPrint, // 반달가슴곰
};

export function SeasonalNotice({
  content,
  className,
}: {
  content: ActiveSeasonalContent;
  className?: string;
}) {
  const { highlights, cautions } = content;

  return (
    <section aria-labelledby="seasonal-heading" className={cn("space-y-3", className)}>
      <h2 id="seasonal-heading" className="text-base font-semibold">
        제철 정보
      </h2>

      {highlights.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {highlights.map((h) => {
            const Icon = HIGHLIGHT_ICON[h.type];
            return (
              <li
                key={`${h.type}:${h.label}`}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1.5 text-sm"
              >
                <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="font-medium">{h.label}</span>
                {h.note ? <span className="text-xs text-muted-foreground">{h.note}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {cautions.map((c) => {
        const Icon = CAUTION_ICON[c.type];
        return (
          <div
            key={c.type}
            className="flex items-start gap-2.5 rounded-lg border bg-muted/50 px-3 py-3"
          >
            <Icon className="mt-0.5 size-5 shrink-0 text-grade-dangerous" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-grade-dangerous">{c.label}</p>
              {c.note ? <p className="text-xs text-muted-foreground">{c.note}</p> : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}
