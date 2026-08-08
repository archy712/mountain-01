/**
 * Supabase 서비스 롤 클라이언트 (서버 전용, Task 023).
 *
 * RLS 를 우회하는 관리자 클라이언트. `condition_scores` 처럼 쓰기가 서비스 롤로만
 * 허용된 캐시 테이블에 서버 유틸에서 write 하기 위해 사용한다(결정 003 RLS 표).
 *
 * ⚠️ 절대 클라이언트 컴포넌트에서 import 하지 말 것. 서비스 롤 키가 노출된다.
 * 쿠키/세션과 무관하므로 `@supabase/supabase-js` 로 상태 없는 클라이언트를 만든다.
 *
 * 서비스 롤 키(`SUPABASE_SERVICE_ROLE_KEY`)가 미설정이면 `null` 을 반환한다.
 * 호출부는 null 일 때 쓰기를 건너뛰어(캐시 미영속) 크래시 없이 동작해야 한다.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { optionalServerEnv } from "@/lib/env";
import type { Database } from "./database.types";

let cached: SupabaseClient<Database> | null | undefined;

/**
 * 서비스 롤 클라이언트를 반환한다(키 미설정 시 null).
 * 세션이 없어 매 요청 새로 만들 필요가 없으므로 모듈 단위로 1회 생성해 재사용한다.
 */
export function createAdminClient(): SupabaseClient<Database> | null {
  if (cached !== undefined) return cached;

  const serviceRoleKey = optionalServerEnv.supabaseServiceRoleKey;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !url) {
    cached = null;
    return cached;
  }

  cached = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
