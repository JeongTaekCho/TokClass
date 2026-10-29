import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 이메일 인증·비밀번호 재설정 링크가 돌아오는 곳: code를 세션으로 바꾸고 이동해요. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const nextParam = req.nextUrl.searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, req.url));
    console.error("[auth] 코드 교환 실패", error.message);
  }
  return NextResponse.redirect(new URL("/login?error=link", req.url));
}
