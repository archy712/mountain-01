-- 후기 계측 이벤트 화이트리스트 확장 (Task 048).
-- analytics_events.event CHECK 제약에 review_add·review_remove·review_report 를 추가한다.
-- (API 라우트 화이트리스트·클라이언트 AnalyticsEvent 타입과 일치해야 insert 성공)

alter table public.analytics_events
  drop constraint if exists analytics_events_event_check;

alter table public.analytics_events
  add constraint analytics_events_event_check check (
    event in (
      'session_start',
      'search_session',
      'search_result_selected',
      'mountain_view',
      'favorite_add',
      'favorite_remove',
      'visited_add',
      'visited_remove',
      'mountain_share',
      'review_add',
      'review_remove',
      'review_report',
      'pwa_prompt_shown',
      'pwa_install_accepted',
      'pwa_install_dismissed',
      'app_installed'
    )
  );
