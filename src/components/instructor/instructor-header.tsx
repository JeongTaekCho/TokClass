import Link from "next/link";
import { LogOut } from "lucide-react";

import { logoutAction } from "@/app/auth-actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function InstructorHeader({ name, children }: { name?: string | null; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo href="/dashboard" size="sm" />
        <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/dashboard">내 방</Link>
          </Button>
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
