/**
 * 공통 하단 풋터 (모바일 우선).
 * 개발자 크레딧을 노출한다. `(main)` 레이아웃 하단에 배치.
 */
export function SiteFooter() {
  return (
    <footer className="border-t py-6">
      <div className="mx-auto w-full max-w-screen-sm px-5 text-center text-xs text-muted-foreground">
        Developed by{" "}
        <a
          href="mailto:archy712@gmail.com"
          className="font-medium underline-offset-4 hover:underline"
        >
          archy712@gmail.com
        </a>
      </div>
    </footer>
  );
}
