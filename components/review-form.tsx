"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StarRatingInput } from "@/components/star-rating";
import { cn } from "@/lib/utils";

const BODY_MAX_LENGTH = 1000;

export interface ReviewSubmitResult {
  ok: boolean;
  error?: string;
}

/**
 * 후기 작성/수정 폼 (Task 048). 별점 입력(필수) + 본문(선택) + 제출.
 *
 * 상태를 부모(`ReviewsPanel`)로 끌어올리지 않고, 제출만 `onSubmit` 으로 위임한다(작성/수정
 * 공용). 별점 미선택 제출은 클라이언트에서 막고, 서버 오류 메시지는 폼 하단에 노출한다.
 */
export function ReviewForm({
  initialRating = 0,
  initialBody = "",
  submitLabel = "후기 등록",
  onSubmit,
  onCancel,
}: {
  initialRating?: number;
  initialBody?: string;
  submitLabel?: string;
  onSubmit: (rating: number, body: string) => Promise<ReviewSubmitResult>;
  onCancel?: () => void;
}) {
  const [rating, setRating] = useState(initialRating);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("별점을 선택해 주세요.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await onSubmit(rating, body);
      if (!res.ok) setError(res.error ?? "저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      <StarRatingInput value={rating} onChange={setRating} disabled={saving} />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="review-body" className="text-sm font-medium">
            후기 <span className="font-normal text-muted-foreground">(선택)</span>
          </label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {body.length}/{BODY_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="review-body"
          value={body}
          maxLength={BODY_MAX_LENGTH}
          rows={3}
          disabled={saving}
          placeholder="탐방로 상태, 소요 시간, 전망 등 다녀온 경험을 남겨 주세요."
          onChange={(e) => setBody(e.target.value)}
          className={cn(
            "min-h-[80px] w-full resize-y rounded-md border bg-background px-3 py-2 text-sm",
            "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            "disabled:opacity-60",
          )}
        />
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" className="h-11" disabled={saving}>
          {saving ? "저장 중…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            disabled={saving}
            onClick={onCancel}
          >
            취소
          </Button>
        ) : null}
      </div>
    </form>
  );
}
