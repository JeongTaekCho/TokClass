import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const TYPES: readonly EmailOtpType[] = ["email", "signup", "recovery", "email_change"];
const DEFAULT_NEXT: Partial<Record<EmailOtpType, string>> = { email: "/pending", signup: "/pending", recovery: "/reset-password" };

/**
 * 이메일 템플릿의 `{{ .TokenHash }}` 링크가 돌아오는 곳 (가입 인증·비밀번호 재설정).
 * /auth/callback(PKCE code)과 달리 가입한 브라우저가 아닌 기기(휴대폰 메일 앱 등)에서 열어도 인증돼요.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tokenHash = sp.get("token_hash");
  const type = sp.get("type") as EmailOtpType | null;
  const nextParam = sp.get("next");

  if (tokenHash && type && TYPES.includes(type)) {
    const fallback = DEFAULT_NEXT[type] ?? "/dashboard";
    const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : fallback;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const url = new URL(next, req.url);
      // 가입 인증 직후에는 안내 화면에서 "인증 완료"를 함께 보여줘요.
      if (type === "email" || type === "signup") url.searchParams.set("verified", "1");
      return NextResponse.redirect(url);
    }
    console.error("[auth] 이메일 링크 확인 실패", error.message);
  }
  return NextResponse.redirect(new URL("/login?error=link", req.url));
}
