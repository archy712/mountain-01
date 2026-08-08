import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * 쿠키에 의존하지 않는 공개 읽기 전용 Supabase 클라이언트 (Task 018).
 *
 * `server.ts` 의 `createClient()` 는 `next/headers` 의 `cookies()` 를 읽어 세션을
 * 다루므로 `'use cache'` 스코프 안에서 호출할 수 없다(요청 API 접근 금지).
 * 산 마스터·인기 산처럼 **인증이 필요 없는 공개 데이터(RLS: anon select 허용)**를
 * 캐시 가능한 함수에서 조회할 때 이 클라이언트를 쓴다.
 *
 * publishable(anon) 키만 사용하므로 RLS 가 그대로 적용된다. 쓰기에는 쓰지 말 것.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
}
