"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, MonitorPlay, Settings, Users, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "live", label: "진행", icon: MonitorPlay },
  { href: "participants", label: "참여자", icon: Users },
  { href: "groups", label: "조 편성", icon: UsersRound },
  { href: "report", label: "리포트", icon: BarChart3 },
  { href: "settings", label: "설정", icon: Settings },
];

export function RoomNav({ roomId, title }: { roomId: string; title: string }) {
  const pathname = usePathname();
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="hidden max-w-[16rem] truncate font-bold lg:inline" title={title}>
        {title}
      </span>
      <nav aria-label="방 메뉴" className="scrollbar-thin flex min-w-0 gap-1 overflow-x-auto">
        {items.map((it) => {
          const href = `/rooms/${roomId}/${it.href}`;
          const active = pathname === href;
          return (
            <Link
              key={it.href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition",
                active ? "bg-primary-soft text-primary-hover" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <it.icon className="size-4" aria-hidden />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
