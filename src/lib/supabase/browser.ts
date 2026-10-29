"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let instructorClient: SupabaseClient | null = null;

/** 강사 브라우저 클라이언트: Supabase Auth 세션 토큰으로 Realtime에 접속해요. */
export function getInstructorSupabase(): SupabaseClient {
  if (!instructorClient) instructorClient = createBrowserClient(url, anonKey);
  return instructorClient;
}

/**
 * 수강생 브라우저 클라이언트: Supabase Auth를 쓰지 않고,
 * 서버가 발급한 짧은 수명의 Realtime 전용 JWT를 accessToken으로 사용해요.
 */
export function createParticipantSupabase(getToken: () => Promise<string>): SupabaseClient {
  return createClient(url, anonKey, {
    accessToken: getToken,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
