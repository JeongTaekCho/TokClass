import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** proxy.ts에서 강사 Supabase 세션 쿠키를 갱신해요. */
export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { response, user: null, supabase: null };

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // 만료된 세션은 여기서 갱신(쿠키 재발급)하고, JWT는 공개 키로 서버에서 바로 검증해요 (Auth 서버 왕복 없음).
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return { response, user: sub ? { id: sub } : null, supabase };
}
