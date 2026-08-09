"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Mountain as MountainIcon } from "lucide-react";

import type { MountainSuggestion } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * 100대명산 목록 + 지역 필터 + 고도 정렬 (Task 036).
 *
 * 서버(`getTop100Mountains`)에서 받은 목록을 클라이언트에서 필터/정렬만 한다(데이터 재요청 없음).
 * 성능상 목록에는 이름·지역·고도 메타만 노출하고 컨디션 점수는 붙이지 않는다(상세 진입 후 계산).
 * 각 항목은 산 상세(`/mountains/[id]`)로 직결. 색상 단독 구분 금지·44px 터치 타깃 규약을 따른다.
 */

type SortKey = "name" | "alt-desc" | "alt-asc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "이름순" },
  { key: "alt-desc", label: "고도 높은순" },
  { key: "alt-asc", label: "고도 낮은순" },
];

/** 지역 칩 노출 순서(광역 시·도 표준 순서). 데이터에 등장하는 토큰만 렌더한다. */
const REGION_ORDER = [
  "서울",
  "인천",
  "경기",
  "강원",
  "충북",
  "충남",
  "대전",
  "전북",
  "전남",
  "광주",
  "경북",
  "대구",
  "경남",
  "부산",
  "울산",
  "제주",
];

/** "전남·경남" 같은 복합 지역 문자열을 광역 토큰으로 분해한다. */
function regionTokens(region: string): string[] {
  return region.split("·").map((t) => t.trim());
}

export function Top100List({ mountains }: { mountains: MountainSuggestion[] }) {
  const [region, setRegion] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("name");

  // 데이터에 실제로 존재하는 지역 토큰만, 표준 순서로.
  const regions = useMemo(() => {
    const present = new Set<string>();
    for (const m of mountains) for (const t of regionTokens(m.region)) present.add(t);
    return REGION_ORDER.filter((r) => present.has(r));
  }, [mountains]);

  const visible = useMemo(() => {
    const filtered = region
      ? mountains.filter((m) => regionTokens(m.region).includes(region))
      : mountains;

    const sorted = [...filtered];
    if (sort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    } else {
      // 고도 정렬: null 은 항상 뒤로.
      sorted.sort((a, b) => {
        const av = a.altitude ?? Number.NEGATIVE_INFINITY;
        const bv = b.altitude ?? Number.NEGATIVE_INFINITY;
        return sort === "alt-desc" ? bv - av : av - bv;
      });
    }
    return sorted;
  }, [mountains, region, sort]);

  return (
    <div className="space-y-4">
      {/* 지역 필터 */}
      <div>
        <h2 className="sr-only">지역 필터</h2>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <FilterChip label="전체" active={region === null} onClick={() => setRegion(null)} />
          {regions.map((r) => (
            <FilterChip
              key={r}
              label={r}
              active={region === r}
              onClick={() => setRegion(region === r ? null : r)}
            />
          ))}
        </div>
      </div>

      {/* 정렬 */}
      <div>
        <h2 className="sr-only">정렬 기준</h2>
        <div
          role="group"
          aria-label="정렬 기준"
          className="inline-flex rounded-lg border p-0.5 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              aria-pressed={sort === opt.key}
              onClick={() => setSort(opt.key)}
              className={cn(
                "inline-flex h-9 items-center rounded-md px-3 font-medium transition-colors",
                sort === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 수(스크린리더 라이브 알림) */}
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {region ? `${region} ` : ""}
        {visible.length}곳
      </p>

      {/* 목록 */}
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          해당 지역의 100대명산이 없어요.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {visible.map((mountain) => (
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
                      {mountain.altitude !== null
                        ? ` · ${mountain.altitude.toLocaleString()}m`
                        : ""}
                    </p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
