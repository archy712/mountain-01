import { Backpack } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GearItem } from "@/lib/types";

/**
 * 장비 추천 목록 (Task 011, PRD 4.2 규칙 엔진 산출물).
 *
 * 조건별 추천 장비를 카드로 나열하고, **추천 근거 문구를 항상 병기**해 왜 필요한지
 * 이해시킨다(예: "방수 자켓 — 강수확률 70%"). 추천이 없으면 안내 문구를 노출한다.
 */
export function GearRecommendationList({
  gear,
  className,
}: {
  gear: GearItem[];
  className?: string;
}) {
  return (
    <section aria-labelledby="gear-heading" className={cn("space-y-3", className)}>
      {/* 컨디션 히어로 카드 내부에 위치하므로 h3(상위 컨디션 점수 h2 아래 중첩) */}
      <h3 id="gear-heading" className="text-base font-semibold">
        추천 장비
      </h3>

      {gear.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          오늘 조건에 특별히 챙길 장비는 없어요.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {gear.map((item) => (
            <li key={item.id}>
              <Card className="flex h-full items-start gap-3 p-3 shadow-sm">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Backpack className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
