import { LogOut } from "lucide-react";

import { logoutAction } from "@/app/auth-actions";
import { Logo } from "@/components/brand/logo";
import { HeaderNav, type HeaderNavItem } from "@/components/instructor/header-nav";
import { Button } from "@/components/ui/button";

/** 강사 화면 헤더. 수강생 화면(`/r`, `/join`)에서는 쓰지 않아요. 관리자 메뉴는 서버에서 확인한 isAdmin일 때만 보여요. */
export function InstructorHeader({ name, isAdmin = false, children }: { name?: string | null; isAdmin?: boolean; children?: React.ReactNode }) {
  const items: HeaderNavItem[] = [
    { href: "/dashboard", label: "내 방", icon: "house" },
    { href: "/manage", label: "수강생 관리", icon: "users" },
    { href: "/lessons", label: "교안", icon: "lessons" },
    ...(isAdmin ? [{ href: "/admin", label: "관리자", icon: "shield" } as const] : []),
  ];
  return (
    <header className="hairline-brand surface-glass sticky top-0 z-30">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <Logo href="/dashboard" size="sm" />
        <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
        <HeaderNav items={items} group="site" label="강사 메뉴" compact className="shrink-0" />
        {name && (
          <span className="hidden items-center gap-2 border-l border-border pl-3 text-sm text-muted-foreground md:inline-flex">
            <span aria-hidden className="inline-flex size-7 items-center justify-center rounded-full bg-brand-vivid text-xs font-bold text-white shadow-[0_2px_6px_-2px_rgb(79_70_229/0.6)]">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-40 truncate">{name}</span>
          </span>
        )}
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="icon-sm" aria-label="로그아웃">
            <LogOut aria-hidden />
          </Button>
        </form>
      </div>
    </header>
  );
}
