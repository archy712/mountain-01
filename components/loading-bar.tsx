import { cn } from "@/lib/utils";

/**
 * 섹션 스트리밍 대기용 무한(indeterminate) 진행바 (Task 034).
 *
 * 서버 스트리밍은 실제 진행률을 알 수 없으므로, 가짜 퍼센트를 흉내 내는 대신 무한
 * 스윕 애니메이션으로 "지금 불러오는 중"만 정직하게 전달한다. 순수 CSS라 클라이언트
 * JS 가 필요 없고, 데이터가 도착하면 Suspense 가 fallback 을 교체하며 자연히 사라진다.
 * 스켈레톤 상단에 얹어 레이아웃 밀림(CLS) 없이 로딩 진행감을 더한다.
 *
 * 접근성: 이 바를 감싸는 스켈레톤 컨테이너가 이미 `aria-busy`로 로딩을 알리므로,
 * 바 자체는 시각 보강용으로 `aria-hidden` 처리해 중복 안내를 피한다. 모션 민감
 * 사용자를 위해 `prefers-reduced-motion`에서는 스윕을 멈추고 은은한 정적 바로 대체한다.
 */
export function LoadingBar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative h-1 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className="absolute inset-y-0 left-0 w-2/5 animate-indeterminate-progress rounded-full bg-primary/70 motion-reduce:w-full motion-reduce:animate-none motion-reduce:bg-primary/25" />
    </div>
  );
}
