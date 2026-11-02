import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/proxy";

/** 승인된 강사만 쓰는 화면 */
const APPROVED_PREFIXES = ["/dashboard", "/rooms", "/manage", "/lessons", "/admin"];
/** 로그인만 필요한 화면 (승인 안내) */
const LOGIN_PREFIXES = ["/pending"];

const matches = (pathname: string, prefixes: string[]) => prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSupabaseCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  const needsInstructor = matches(pathname, APPROVED_PREFIXES) || matches(pathname, LOGIN_PREFIXES);

  // 수강생 화면·API는 Supabase 세션이 필요 없어요. 강사 쿠키가 있을 때만 갱신합니다.
  if (!hasSupabaseCookie && !needsInstructor) return NextResponse.next();

  const { response, user } = await updateSupabaseSession(request);

  if (needsInstructor && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 승인 여부는 페이지·API가 서버에서 확인해요(requireApprovedInstructor → /pending). 여기서 한 번 더 조회하지 않아 화면 이동이 빨라요.
  return response;
}

export const config = {
  matcher: ["/((?!auth/callback|auth/confirm|_next/static|_next/image|icon.svg|logo.svg|logo-mark.svg|fonts/|pdf.worker.min.mjs|api/join|api/view).*)"],
};
