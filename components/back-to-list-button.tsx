"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * 상세 화면 → 목록 복귀 버튼.
 *
 * 하이브리드 동작: 앱 내에서 진입한 경우(브라우저 히스토리 존재) `router.back()` 으로
 * 돌아가 **직전 검색 결과·스크롤 위치를 그대로 보존**한다. 공유 링크·PWA 콜드스타트처럼
 * 히스토리가 없으면 홈(`/`)으로 폴백한다.
 *
 * 44px 터치 타깃 + 실제 `<button>`(키보드/스크린리더 접근)으로 구현한다.
 */
export function BackToListButton({ label = "목록으로" }: { label?: string }) {
  const router = useRouter();

  function handleBack() {
    // history.length 는 1(현재 항목)이면 이 탭에서 첫 페이지 → 돌아갈 앱 내 이력이 없다.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="-ml-2 inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
