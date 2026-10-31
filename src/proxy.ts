import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/proxy";

/** 승인된 강사만 쓰는 화면 */
const APPROVED_PREFIXES = ["/dashboard", "/rooms", "/manage", "/admin"];
/** 로그인만 필요한 화면 (승인 안내) */
const LOGIN_PREFIXES = ["/pending"];

const matches = (pathname: string, prefixes: string[]) => prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSupabaseCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  const needsApproved = matches(pathname, APPROVED_PREFIXES);
  const needsInstructor = needsApproved || matches(pathname, LOGIN_PREFIXES);

  // 수강생 화면·API는 Supabase 세션이 필요 없어요. 강사 쿠키가 있을 때만 갱신합니다.
  if (!hasSupabaseCookie && !needsInstructor) return NextResponse.next();

  const { response, user, supabase } = await updateSupabaseSession(request);

  if (needsInstructor && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 낙관적 확인: 본인 프로필(RLS self read)이 승인 상태가 아니면 안내 화면으로. 실제 권한 확인은 페이지·API가 서버에서 다시 해요.
  // 행을 읽지 못하면(정책 미적용 등) 여기서 판단하지 않아요. /pending ↔ /dashboard 리다이렉트 반복을 막기 위해서예요.
  if (needsApproved && user && supabase) {
    const { data } = await supabase.from("instructor_profiles").select("status").eq("user_id", user.id).maybeSingle();
    if (data && data.status !== "approved") {
      const redirect = NextResponse.redirect(new URL("/pending", request.url));
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!auth/callback|auth/confirm|_next/static|_next/image|icon.svg|logo.svg|logo-mark.svg|fonts/|pdf.worker.min.mjs|api/join|api/view).*)"],
};
