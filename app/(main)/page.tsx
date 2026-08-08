import { MountainSearchInput } from "@/components/mountain-search-input";
import { PopularMountains } from "@/components/popular-mountains";
import { RecentSearches } from "@/components/recent-searches";

/**
 * 홈/검색 화면 (Task 009).
 *
 * "결론 우선" 진입점: 산 이름 하나로 상세 결과로 직행한다(결정 002 #2).
 * 히어로 카피 + 자동완성 검색 + 최근 검색 칩 + 인기 산 그리드.
 * 서버 컴포넌트로 두고, 상호작용 영역(검색·최근 검색)만 클라이언트 컴포넌트로 분리한다.
 */
export default function HomePage() {
  return (
    <div className="space-y-8 pt-8">
      <section className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">지금 이 산에 가도 될까?</h1>
        <p className="text-sm text-muted-foreground">
          산 이름 하나로 오늘 날씨·탐방로·컨디션을 3초 안에.
        </p>
      </section>

      <MountainSearchInput />

      <RecentSearches />

      <PopularMountains />
    </div>
  );
}
