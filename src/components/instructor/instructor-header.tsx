import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";

import { logoutAction } from "@/app/auth-actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/** 강사 화면 헤더. 수강생 화면(`/r`, `/join`)에서는 쓰지 않아요. 관리자 메뉴는 서버에서 확인한 isAdmin일 때만 보여요. */
export function InstructorHeader({ name, isAdmin = false, children }: { name?: string | null; isAdmin?: boolean; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo href="/dashboard" size="sm" />
        <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/dashboard">내 방</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/manage">수강생 관리</Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <ShieldCheck aria-hidden /> 관리자
              </Link>
            </Button>
          )}
          {name && <span className="hidden px-2 text-sm text-muted-foreground md:inline">{name}님</span>}
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="icon-sm" aria-label="로그아웃">
              <LogOut aria-hidden />
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
