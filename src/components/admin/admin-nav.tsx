"use client";

import { HeaderNav, type HeaderNavItem } from "@/components/instructor/header-nav";

export function AdminNav({ pendingCount }: { pendingCount: number }) {
  const items: HeaderNavItem[] = [
    { href: "/admin", label: "개요", icon: "overview", exact: true },
    {
      href: "/admin/instructors",
      label: "강사",
      icon: "instructors",
      badge: pendingCount > 0 && (
        <span className="rounded-full bg-coral px-1.5 text-xs font-semibold text-ink tabular-nums" aria-label={`승인 대기 ${pendingCount}명`}>
          {pendingCount}
        </span>
      ),
    },
    { href: "/admin/rooms", label: "방", icon: "rooms" },
    { href: "/admin/lessons", label: "공용 교안", icon: "lessons" },
    { href: "/admin/audit", label: "감사 로그", icon: "audit" },
  ];
  return <HeaderNav items={items} group="admin" label="관리자 메뉴" className="border-l border-border pl-3" />;
}
