import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/proxy";

const INSTRUCTOR_PREFIXES = ["/dashboard", "/rooms"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSupabaseCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  const needsInstructor = INSTRUCTOR_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // 수강생 화면·API는 Supabase 세션이 필요 없어요. 강사 쿠키가 있을 때만 갱신합니다.
  if (!hasSupabaseCookie && !needsInstructor) return NextResponse.next();

  const { response, user } = await updateSupabaseSession(request);

  if (needsInstructor && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|logo.svg|logo-mark.svg|fonts/|pdf.worker.min.mjs|api/join|api/view).*)"],
};
