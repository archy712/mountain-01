import { LoadingBar } from "@/components/loading-bar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 즐겨찾기 목록 로딩 스켈레톤 (즐겨찾기 로딩 UX 개선).
 *
 * 산 목록(DB) 조회 동안 실제 카드 레이아웃을 흉내 낸 행 + 상단 로딩 바로 "불러오는 중"을
 * 정직하게 전달한다(빈 박스 하나로 "멈춤"처럼 보이던 문제 해결). DB 조회는 짧아 이 폴백은
 * 잠깐만 노출되고, 이후 각 카드의 점수는 카드별로 이어서 스트리밍된다(`FavoriteScore`).
 * 컨테이너에 `aria-busy` 로 로딩을 알린다(로딩 바 자체는 시각 보강용 `aria-hidden`).
 */
export function FavoritesListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="즐겨찾기 불러오는 중">
      <LoadingBar />
      <ul className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i}>
            <Card className="flex items-center gap-2 p-2 shadow-sm">
              <div className="flex min-w-0 flex-1 items-center gap-3 p-2">
                <Skeleton className="size-5 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="size-11 shrink-0 rounded-full" />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
