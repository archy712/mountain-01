"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilLine, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/star-rating";
import { ReviewForm } from "@/components/review-form";
import { ReviewList, formatReviewDate } from "@/components/review-list";
import { computeReviewSummary } from "@/lib/reviews/summary";
import { track } from "@/lib/analytics/client";
import type { ReviewView } from "@/lib/data/reviews";

/**
 * 후기 섹션 클라이언트 오케스트레이터 (Task 048).
 *
 * 서버(`ReviewSection`)가 넘긴 초기 후기·세션·작성자격을 받아 요약·작성폼·목록을 조립하고,
 * 작성/수정/삭제/신고를 `/api/reviews*` 로 처리한다. 낙관적 업데이트 후 `router.refresh()` 로
 * 서버 렌더와 재조정한다(favorite/visited 패턴). 본인 후기는 상단 카드로 분리해 수정/삭제하고,
 * 타인 후기는 목록에서 신고할 수 있다.
 */
export function ReviewsPanel({
  mountainId,
  initialReviews,
  isAuthenticated,
  hasVisited,
}: {
  mountainId: string;
  initialReviews: ReviewView[];
  isAuthenticated: boolean;
  /** 이 산을 방문완료(visited)했는지 — 작성 자격. */
  hasVisited: boolean;
}) {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewView[]>(initialReviews);
  const [editing, setEditing] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const ownReview = reviews.find((r) => r.isOwn) ?? null;
  const others = reviews.filter((r) => !r.isOwn && !r.isHidden);
  const summary = computeReviewSummary(
    reviews.filter((r) => !r.isHidden).map((r) => ({ rating: r.rating })),
  );

  async function submitReview(rating: number, body: string) {
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mountainId, rating, body }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        return { ok: false, error: data?.error };
      }
      const { data } = (await res.json()) as {
        data: {
          id: string;
          rating: number;
          body: string | null;
          author_name: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      const saved: ReviewView = {
        id: data.id,
        mountainId,
        rating: data.rating,
        body: data.body,
        authorName: data.author_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isHidden: false,
        isOwn: true,
      };
      setReviews((prev) => {
        const rest = prev.filter((r) => r.id !== saved.id && !r.isOwn);
        return [saved, ...rest];
      });
      setEditing(false);
      track("review_add", { mountainId });
      router.refresh();
      return { ok: true };
    } catch {
      return { ok: false, error: "네트워크 오류예요. 잠시 후 다시 시도해 주세요." };
    }
  }

  async function deleteOwnReview() {
    if (!ownReview) return;
    if (!window.confirm("후기를 삭제할까요?")) return;
    const removed = ownReview;
    setActionError(null);
    setReviews((prev) => prev.filter((r) => r.id !== removed.id)); // 낙관적 제거
    try {
      const res = await fetch(`/api/reviews?id=${encodeURIComponent(removed.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(String(res.status));
      track("review_remove", { mountainId });
      router.refresh();
    } catch {
      setReviews((prev) => [removed, ...prev.filter((r) => r.id !== removed.id)]); // 롤백
      setActionError("후기를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function reportReview(reviewId: string) {
    if (reportedIds.has(reviewId) || reportingId) return;
    setActionError(null);
    setReportingId(reviewId);
    setReportedIds((prev) => new Set(prev).add(reviewId)); // 낙관적 표시
    try {
      const res = await fetch("/api/reviews/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      track("review_report", { mountainId });
      router.refresh(); // 임계치 도달 시 서버에서 숨김 반영
    } catch {
      setReportedIds((prev) => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
      setActionError("신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setReportingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* 요약: 평균 별점 + 후기 수 + 분포 */}
      {summary.count > 0 ? (
        <ReviewSummaryPanel summary={summary} />
      ) : (
        <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          아직 후기가 없어요. 다녀오셨다면 첫 후기를 남겨 보세요.
        </p>
      )}

      {/* 작성 영역 — 로그인/방문완료 자격에 따라 분기 */}
      <WriteArea
        isAuthenticated={isAuthenticated}
        hasVisited={hasVisited}
        ownReview={ownReview}
        editing={editing}
        onStartEdit={() => setEditing(true)}
        onCancelEdit={() => setEditing(false)}
        onDelete={deleteOwnReview}
        onSubmit={submitReview}
      />

      {actionError ? (
        <p role="alert" className="text-xs text-destructive">
          {actionError}
        </p>
      ) : null}

      {/* 타인 후기 목록 */}
      <ReviewList
        reviews={others}
        canReport={isAuthenticated}
        reportedIds={reportedIds}
        reportingId={reportingId}
        onReport={reportReview}
      />
    </div>
  );
}

/** 평균 별점 + 별점 분포 막대(색상 단독 금지: 숫자 병기). */
function ReviewSummaryPanel({ summary }: { summary: ReturnType<typeof computeReviewSummary> }) {
  const max = Math.max(1, ...summary.distribution.map((d) => d.count));
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-1">
        <span className="text-3xl font-bold tabular-nums">{summary.average.toFixed(1)}</span>
        <div className="flex flex-col gap-0.5">
          <StarRating value={summary.average} size="md" showValue={false} />
          <span className="text-xs text-muted-foreground">후기 {summary.count}개</span>
        </div>
      </div>
      <div className="flex-1 space-y-1" aria-hidden="true">
        {summary.distribution.map((d) => (
          <div key={d.star} className="flex items-center gap-2 text-xs">
            <span className="w-6 shrink-0 text-muted-foreground tabular-nums">{d.star}점</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-muted-foreground tabular-nums">
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 로그인/방문완료 여부와 본인 후기 유무에 따라 작성 폼·본인 후기 카드·안내를 분기 렌더. */
function WriteArea({
  isAuthenticated,
  hasVisited,
  ownReview,
  editing,
  onStartEdit,
  onCancelEdit,
  onDelete,
  onSubmit,
}: {
  isAuthenticated: boolean;
  hasVisited: boolean;
  ownReview: ReviewView | null;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onSubmit: (rating: number, body: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-4 text-sm">
        <p className="text-muted-foreground">로그인하면 다녀온 산의 후기를 남길 수 있어요.</p>
        <Link
          href="/auth/login"
          className="mt-2 inline-flex h-11 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  // 본인 후기가 있고 편집 중이 아니면 → 카드 + 수정/삭제.
  if (ownReview && !editing) {
    return (
      <div className="space-y-2 rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                내 후기
              </span>
              {ownReview.isHidden ? (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  신고 누적으로 숨김 처리됨
                </span>
              ) : null}
            </div>
            <StarRating value={ownReview.rating} size="md" showValue={false} />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-9 gap-1" onClick={onStartEdit}>
              <PencilLine className="size-3.5" aria-hidden="true" />
              수정
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              삭제
            </Button>
          </div>
        </div>
        {ownReview.body ? (
          <p className="text-sm whitespace-pre-wrap text-foreground/90">{ownReview.body}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{formatReviewDate(ownReview.createdAt)}</p>
      </div>
    );
  }

  // 편집 중이거나 신규 작성 — 방문완료 자격 필요.
  if (!hasVisited) {
    return (
      <div className="rounded-lg border bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
        이 산을 <span className="font-medium text-foreground">방문완료</span>로 기록하면 후기를 쓸
        수 있어요. 상단의 방문완료 버튼을 눌러 주세요.
      </div>
    );
  }

  return (
    <ReviewForm
      key={ownReview?.id ?? "new"}
      initialRating={ownReview?.rating ?? 0}
      initialBody={ownReview?.body ?? ""}
      submitLabel={ownReview ? "후기 수정" : "후기 등록"}
      onSubmit={onSubmit}
      onCancel={ownReview ? onCancelEdit : undefined}
    />
  );
}
