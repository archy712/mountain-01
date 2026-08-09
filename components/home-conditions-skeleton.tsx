import { LoadingBar } from "@/components/loading-bar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 홈 컨디션 블록(내 산 오늘 컨디션 · 지금 갈 만한 산) 공용 로딩 스켈레톤.
 *
 * 세션·외부 API(컨디션)를 기다리는 동안 실제 카드 그리드 레이아웃을 흉내 내 CLS 를 피하고,
 * 상단 `LoadingBar` + `role="status"` 로 "불러오는 중"을 정직하게 전달한다. 제목은 특정
 * 문구 대신 회색 바로 두어(비로그인 시 블록이 통째로 사라져도 오해가 없도록) 중립적으로 둔다.
 */
export function HomeConditionsSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <section aria-busy="true" className="space-y-3">
      <span role="status" className="sr-only">
        산 컨디션을 불러오는 중입니다…
      </span>
      <LoadingBar />
      <div aria-hidden="true" className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: cards }).map((_, i) => (
            <Card key={i} className="flex h-24 flex-col justify-between gap-3 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-[22px] w-16 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
