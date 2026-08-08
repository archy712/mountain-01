import { notFound } from "next/navigation";

import { MountainDetail } from "@/components/mountain-detail";
import { TrailList } from "@/components/trail-list";
import { WeatherSummaryCard } from "@/components/weather-summary-card";
import { getMockMountainDetail } from "@/lib/mock";

/**
 * 산 상세 결과 화면 (Task 010, 1단계 범위: 메타·날씨·탐방로).
 *
 * "결론 우선" 정보 위계: 산 식별(메타) → 날씨 요약(히어로) → 탐방로 상태 순으로
 * 스크롤 없이 오늘 산행 가부를 판단하게 한다. 컨디션 점수·장비·대기질은 Task 011.
 *
 * 현재는 더미(`getMockMountainDetail`). 실데이터 연동·`notFound()` 정식 처리는 Task 019.
 * 소스별 부분 실패는 각 컴포넌트(`WeatherSummaryCard`·`TrailList`)가 격리 렌더한다.
 */
export default async function MountainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = getMockMountainDetail(id);

  if (!detail) notFound();

  return (
    <div className="space-y-6 py-6">
      <MountainDetail mountain={detail.mountain} />
      <WeatherSummaryCard result={detail.weather} />
      <TrailList result={detail.trails} />
    </div>
  );
}
