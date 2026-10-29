import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/env";

let admin: SupabaseClient | null = null;

/** service role 클라이언트. RLS를 우회하므로 반드시 권한 확인 후에만 사용하세요. */
export function db(): SupabaseClient {
  if (!admin) {
    admin = createClient(serverEnv.supabaseUrl, serverEnv.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "x-client-info": "tokclass-server" } },
    });
  }
  return admin;
}
