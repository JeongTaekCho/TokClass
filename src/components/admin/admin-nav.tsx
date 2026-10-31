"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DoorOpen, LayoutDashboard, ScrollText, UserCheck } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "개요", icon: LayoutDashboard, exact: true },
  { href: "/admin/instructors", label: "강사", icon: UserCheck },
  { href: "/admin/rooms", label: "방", icon: DoorOpen },
  { href: "/admin/audit", label: "감사 로그", icon: ScrollText },
];

export function AdminNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자 메뉴" className="scrollbar-thin flex min-w-0 gap-1 overflow-x-auto">
      {items.map((it) => {
        const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition",
              active ? "bg-primary-soft text-primary-hover" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <it.icon className="size-4" aria-hidden />
            {it.label}
            {it.href === "/admin/instructors" && pendingCount > 0 && (
              <span className="rounded-full bg-coral px-1.5 text-xs text-white" aria-label={`승인 대기 ${pendingCount}명`}>
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
