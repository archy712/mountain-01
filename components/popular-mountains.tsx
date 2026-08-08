import Link from "next/link";
import { ChevronRight, Mountain as MountainIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { POPULAR_MOUNTAINS } from "@/lib/mock";

/**
 * 인기 산 카드 그리드 (Task 009).
 *
 * 현재는 더미(`POPULAR_MOUNTAINS`). Task 018에서 `search_logs`(결정 002 #14) 기반
 * 실집계로 대체한다. 각 카드는 산 상세로 직결한다. 360px 폭에서도 2열 유지.
 */
export function PopularMountains() {
  return (
    <section aria-labelledby="popular-mountains-heading" className="space-y-3">
      <h2 id="popular-mountains-heading" className="text-sm font-semibold text-muted-foreground">
        인기 산
      </h2>

      <ul className="grid grid-cols-2 gap-3">
        {POPULAR_MOUNTAINS.map((mountain) => (
          <li key={mountain.id}>
            <Link href={`/mountains/${mountain.id}`} className="block h-full">
              <Card className="flex h-full min-h-11 flex-col justify-between gap-3 p-4 shadow-sm transition-colors hover:bg-accent">
                <MountainIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold tracking-tight">{mountain.name}</span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {mountain.region}
                    {mountain.altitude !== null ? ` · ${mountain.altitude.toLocaleString()}m` : ""}
                  </p>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
