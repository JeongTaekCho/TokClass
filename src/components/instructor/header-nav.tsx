"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, House, LayoutDashboard, MonitorPlay, School, ScrollText, Settings2, Shapes, ShieldCheck, UserCog, Users } from "lucide-react";

import { ActiveIndicator } from "@/components/motion";
import { cn } from "@/lib/utils";

/** 서버 컴포넌트(헤더)에서도 넘길 수 있게 아이콘은 이름으로 받아요. */
const ICONS = {
  house: House,
  users: Users,
  shield: ShieldCheck,
  live: MonitorPlay,
  groups: Shapes,
  report: BarChart3,
  settings: Settings2,
  overview: LayoutDashboard,
  instructors: UserCog,
  rooms: School,
  audit: ScrollText,
};

export type HeaderNavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean; badge?: React.ReactNode };

/**
 * 헤더 안 메뉴(사이트 메뉴, 방 메뉴, 관리자 메뉴). 현재 위치는 연한 인디고 알약이고,
 * 메뉴를 옮기면 알약이 미끄러지듯 따라가요(같은 group끼리).
 */
export function HeaderNav({ items, group, label, className, compact = false }: { items: HeaderNavItem[]; group: string; label: string; className?: string; compact?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className={cn("scrollbar-none flex min-w-0 items-center gap-0.5 overflow-x-auto", className)}>
      {items.map((it) => {
        const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`);
        const Icon = ICONS[it.icon];
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm transition-colors duration-150",
              active ? "font-semibold text-primary-ink" : "font-medium text-muted-foreground hover:bg-sunken hover:text-foreground",
            )}
          >
            {active && <ActiveIndicator layoutId={`nav-${group}`} className="absolute inset-0 rounded-md bg-primary-soft" />}
            <Icon aria-hidden className="relative size-4" strokeWidth={2} />
            <span className={cn("relative", compact && "sr-only md:not-sr-only")}>{it.label}</span>
            {it.badge && <span className="relative">{it.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
