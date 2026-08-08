import { SiteHeader } from "@/components/site-header";

/**
 * 메인 앱 공통 레이아웃 (라우트 그룹 `(main)`).
 * 홈·산 상세·즐겨찾기가 공유한다. 모바일 우선 최대폭 컨테이너 + 상단 헤더.
 * `/offline`, `/auth/*`, `/protected/*` 는 이 레이아웃을 상속하지 않는다.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-screen-sm flex-1 px-5 pb-16">{children}</main>
    </div>
  );
}
