"use client";

import { HeaderNav, type HeaderNavItem } from "@/components/instructor/header-nav";

export function RoomNav({ roomId, title }: { roomId: string; title: string }) {
  const items: HeaderNavItem[] = [
    { href: `/rooms/${roomId}/live`, label: "진행", icon: "live" },
    { href: `/rooms/${roomId}/participants`, label: "참여자", icon: "users" },
    { href: `/rooms/${roomId}/groups`, label: "조 편성", icon: "groups" },
    { href: `/rooms/${roomId}/report`, label: "리포트", icon: "report" },
    { href: `/rooms/${roomId}/settings`, label: "설정", icon: "settings" },
  ];
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="hidden max-w-[14rem] items-center border-l border-border pl-4 font-semibold xl:flex" title={title}>
        <span className="truncate">{title}</span>
      </span>
      <HeaderNav items={items} group="room" label="방 메뉴" />
    </div>
  );
}
