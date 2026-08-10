"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Mountain as MountainIcon, Star } from "lucide-react";

import type { RecommendMountain } from "@/lib/data/recommend";
import { DIFFICULTY_LEVEL_LABEL, type DifficultyLevel } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * 산 추천 필터 (Task 042).
 *
 * 서버(`getRecommendMountains`)에서 받은 전체 후보를 클라이언트에서 지역·고도대·난이도로
 * 필터링/정렬만 한다(데이터 재요청 없음). 100대명산 목록(Task 036)과 동일하게 목록에는
 * 메타(+대표 난이도)만 노출하고 컨디션 점수는 붙이지 않아 외부 API 호출 폭증을 막는다.
 * 각 항목은 산 상세(`/mountains/[id]`)로 직결. 색상 단독 구분 금지·44px 터치 타깃 준수.
 */

type SortKey = "name" | "alt-desc" | "alt-asc" | "diff-asc" | "diff-desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "이름순" },
  { key: "alt-desc", label: "고도 높은순" },
  { key: "alt-asc", label: "고도 낮은순" },
  { key: "diff-asc", label: "쉬운순" },
  { key: "diff-desc", label: "어려운순" },
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

/** 고도대 필터. min 이상 max 미만(max=null 은 상한 없음). */
type AltBand = { key: string; label: string; min: number; max: number | null };
const ALT_BANDS: AltBand[] = [
  { key: "lt500", label: "500m 미만", min: 0, max: 500 },
  { key: "500-1000", label: "500~1000m", min: 500, max: 1000 },
  { key: "1000-1500", label: "1000~1500m", min: 1000, max: 1500 },
  { key: "gte1500", label: "1500m 이상", min: 1500, max: null },
];

/** 난이도 그룹 필터. 대표 난이도(별 1~5)를 3구간으로 묶는다. */
type DiffGroup = { key: string; label: string; levels: DifficultyLevel[] };
const DIFF_GROUPS: DiffGroup[] = [
  { key: "easy", label: "쉬운 편", levels: [1, 2] },
  { key: "moderate", label: "보통", levels: [3] },
  { key: "hard", label: "힘든 편", levels: [4, 5] },
];

/** "전남·경남" 같은 복합 지역 문자열을 광역 토큰으로 분해한다. */
function regionTokens(region: string): string[] {
  return region.split("·").map((t) => t.trim());
}

export function MountainRecommend({ mountains }: { mountains: RecommendMountain[] }) {
  const [region, setRegion] = useState<string | null>(null);
  const [altBand, setAltBand] = useState<string | null>(null);
  const [diffGroup, setDiffGroup] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("name");

  // 데이터에 실제로 존재하는 지역 토큰만, 표준 순서로.
  const regions = useMemo(() => {
    const present = new Set<string>();
    for (const m of mountains) for (const t of regionTokens(m.region)) present.add(t);
    return REGION_ORDER.filter((r) => present.has(r));
  }, [mountains]);

  const visible = useMemo(() => {
    const band = ALT_BANDS.find((b) => b.key === altBand) ?? null;
    const group = DIFF_GROUPS.find((g) => g.key === diffGroup) ?? null;

    const filtered = mountains.filter((m) => {
      if (region && !regionTokens(m.region).includes(region)) return false;
      if (band) {
        if (m.altitude === null) return false;
        if (m.altitude < band.min) return false;
        if (band.max !== null && m.altitude >= band.max) return false;
      }
      if (group) {
        if (m.difficulty === null) return false;
        if (!group.levels.includes(m.difficulty)) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    if (sort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    } else if (sort === "alt-desc" || sort === "alt-asc") {
      // 고도 정렬: null 은 항상 뒤로.
      sorted.sort((a, b) => {
        const av = a.altitude ?? Number.NEGATIVE_INFINITY;
        const bv = b.altitude ?? Number.NEGATIVE_INFINITY;
        return sort === "alt-desc" ? bv - av : av - bv;
      });
    } else {
      // 난이도 정렬: null(정보 없음) 은 항상 뒤로.
      sorted.sort((a, b) => {
        const av = a.difficulty ?? (sort === "diff-asc" ? Number.POSITIVE_INFINITY : -1);
        const bv = b.difficulty ?? (sort === "diff-asc" ? Number.POSITIVE_INFINITY : -1);
        return sort === "diff-asc" ? av - bv : bv - av;
      });
    }
    return sorted;
  }, [mountains, region, altBand, diffGroup, sort]);

  return (
    <div className="space-y-4">
      {/* 지역 필터 */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">지역</h2>
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

      {/* 고도대 필터 */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">고도</h2>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <FilterChip label="전체" active={altBand === null} onClick={() => setAltBand(null)} />
          {ALT_BANDS.map((b) => (
            <FilterChip
              key={b.key}
              label={b.label}
              active={altBand === b.key}
              onClick={() => setAltBand(altBand === b.key ? null : b.key)}
            />
          ))}
        </div>
      </div>

      {/* 난이도 필터 */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">난이도</h2>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <FilterChip label="전체" active={diffGroup === null} onClick={() => setDiffGroup(null)} />
          {DIFF_GROUPS.map((g) => (
            <FilterChip
              key={g.key}
              label={g.label}
              active={diffGroup === g.key}
              onClick={() => setDiffGroup(diffGroup === g.key ? null : g.key)}
            />
          ))}
        </div>
      </div>

      {/* 정렬 */}
      <div>
        <h2 className="sr-only">정렬 기준</h2>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          <div
            role="group"
            aria-label="정렬 기준"
            className="inline-flex shrink-0 rounded-lg border p-0.5 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                aria-pressed={sort === opt.key}
                onClick={() => setSort(opt.key)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center rounded-md px-3 font-medium transition-colors",
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
      </div>

      {/* 결과 수(스크린리더 라이브 알림) */}
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {visible.length}곳
      </p>

      {/* 목록 */}
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          조건에 맞는 산이 없어요. 필터를 바꿔보세요.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {visible.map((mountain) => (
            <li key={mountain.id}>
              <Link href={`/mountains/${mountain.id}`} className="block h-full">
                <Card className="flex h-full min-h-11 flex-col justify-between gap-3 p-4 shadow-sm transition-colors hover:bg-accent">
                  <div className="flex items-start justify-between gap-1">
                    <MountainIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="block font-semibold tracking-tight">{mountain.name}</span>
                    <p className="text-xs text-muted-foreground">
                      {mountain.region}
                      {mountain.altitude !== null
                        ? ` · ${mountain.altitude.toLocaleString()}m`
                        : ""}
                    </p>
                    <DifficultyStars level={mountain.difficulty} />
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

/**
 * 대표 난이도 표시. 색상 단독 구분 금지 원칙에 따라 채워진 별 개수(형태)+텍스트 라벨을 함께
 * 노출하고, 정보가 없으면 "난이도 정보 없음"으로 대체한다.
 */
function DifficultyStars({ level }: { level: DifficultyLevel | null }) {
  if (level === null) {
    return <p className="text-xs text-muted-foreground">난이도 정보 없음</p>;
  }
  const label = DIFFICULTY_LEVEL_LABEL[level];
  return (
    <p className="flex items-center gap-1 text-xs" aria-label={`난이도 ${label}`}>
      <span className="flex" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "size-3",
              i < level ? "fill-primary text-primary" : "fill-none text-muted-foreground/40",
            )}
          />
        ))}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </p>
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
