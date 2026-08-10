"use client";

import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/star-rating";
import type { ReviewView } from "@/lib/data/reviews";

/** ISO 문자열 → "2026.08.11" (KST 표기). 목록·본인 카드가 공유한다. */
export function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/** author_name 스냅샷이 없으면 익명 폴백. */
function displayName(name: string | null): string {
  return name && name.trim().length > 0 ? name : "익명 사용자";
}

/**
 * 타인 후기 목록 (Task 048). 각 항목은 작성자·별점·본문·날짜 + 신고 버튼을 노출한다.
 * 신고는 로그인 사용자만 가능하고, 낙관적으로 "신고됨"으로 바뀐다(누적 임계치 도달 시 서버가 숨김).
 */
export function ReviewList({
  reviews,
  canReport,
  reportedIds,
  reportingId,
  onReport,
}: {
  reviews: ReviewView[];
  /** 로그인 사용자만 신고 가능. */
  canReport: boolean;
  reportedIds: Set<string>;
  reportingId: string | null;
  onReport: (reviewId: string) => void;
}) {
  if (reviews.length === 0) return null;

  return (
    <ul className="space-y-3">
      {reviews.map((r) => {
        const reported = reportedIds.has(r.id);
        return (
          <li key={r.id} className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <span className="text-sm font-medium">{displayName(r.authorName)}</span>
                <StarRating value={r.rating} size="sm" showValue={false} />
              </div>
              {canReport ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1 text-muted-foreground hover:text-foreground disabled:opacity-60"
                  disabled={reported || reportingId === r.id}
                  aria-label={reported ? "신고됨" : "이 후기 신고하기"}
                  onClick={() => onReport(r.id)}
                >
                  <Flag className="size-3.5" aria-hidden="true" />
                  {reported ? "신고됨" : "신고"}
                </Button>
              ) : null}
            </div>
            {r.body ? (
              <p className="text-sm whitespace-pre-wrap text-foreground/90">{r.body}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">{formatReviewDate(r.createdAt)}</p>
          </li>
        );
      })}
    </ul>
  );
}
