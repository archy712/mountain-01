import { ResultSkeleton } from "@/components/result-skeleton";

// 산 상세 로딩 스켈레톤. Task 008에서 만든 공통 `ResultSkeleton` 을 사용한다.
export default function MountainDetailLoading() {
  return <ResultSkeleton className="py-6" />;
}
