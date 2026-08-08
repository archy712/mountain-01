import Link from "next/link";
import { ChevronRight, Mountain as MountainIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getPopularMountains } from "@/lib/data/mountains";

/**
 * 인기 산 카드 그리드 (Task 009 UI → Task 018 실데이터).
 *
 * `search_logs`(결정 002 #14) 선택 로그 상위 산을 집계하고, 로그가 부족하면 마스터
 * 기본 순서로 백필한다(`getPopularMountains`, `'use cache'`). 각 카드는 산 상세로
 * 직결한다. 360px 폭에서도 2열 유지. 데이터가 비면 영역을 렌더하지 않는다.
 */
export async function PopularMountains() {
  const mountains = await getPopularMountains(4);
  if (mountains.length === 0) return null;

  return (
    <section aria-labelledby="popular-mountains-heading" className="space-y-3">
      <h2 id="popular-mountains-heading" className="text-sm font-semibold text-muted-foreground">
        인기 산
      </h2>

      <ul className="grid grid-cols-2 gap-3">
        {mountains.map((mountain) => (
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
