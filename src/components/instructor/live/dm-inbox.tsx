"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowLeft, Search } from "lucide-react";

import { DmThread } from "@/components/room/dm-thread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetcher } from "@/lib/client/api";
import { timeAgo } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import { cn } from "@/lib/utils";

type Thread = { participantId: string; lastBody: string; lastAt: string; unread: number };
type ParticipantLite = { id: string; nickname: string };

/** 강사 1:1 대화: 수강생마다 대화방이 하나씩 있는 목록. 대화가 없어도 누르면 바로 시작해요. */
export function DmInbox({ openWith, onOpenChange }: { openWith?: string | null; onOpenChange?: (id: string | null) => void }) {
  const { roomId, online } = useRoom();
  const [selfSelected, setSelfSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const selected = openWith !== undefined ? openWith : selfSelected;
  const select = (id: string | null) => (onOpenChange ? onOpenChange(id) : setSelfSelected(id));
  const { data, mutate } = useSWR<{ threads: Thread[] }>(`/api/rooms/${roomId}/dms`, fetcher);
  const { data: pData } = useSWR<{ participants: ParticipantLite[] }>(`/api/rooms/${roomId}/participants`, fetcher);
  useRoomEvent("dm.new", () => void mutate());

  const rooms = useMemo(() => {
    const threads = new Map((data?.threads ?? []).map((t) => [t.participantId, t]));
    const isOnline = (id: string) => online.get(id)?.kind === "participant";
    return (pData?.participants ?? [])
      .map((p) => ({ ...p, thread: threads.get(p.id), online: isOnline(p.id) }))
      .sort(
        (a, b) =>
          (b.thread?.unread ?? 0) - (a.thread?.unread ?? 0) ||
          (b.thread?.lastAt ?? "").localeCompare(a.thread?.lastAt ?? "") ||
          Number(b.online) - Number(a.online) ||
          a.nickname.localeCompare(b.nickname, "ko"),
      );
  }, [data, pData, online]);

  if (selected) {
    const who = rooms.find((r) => r.id === selected);
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <Button variant="ghost" size="icon-sm" aria-label="대화방 목록으로" onClick={() => select(null)}>
            <ArrowLeft aria-hidden />
          </Button>
          <span className="min-w-0 truncate font-semibold">{who?.nickname ?? "수강생"}님과 1:1</span>
          {who?.online && <span className="ml-auto shrink-0 text-xs text-success">접속 중</span>}
        </div>
        <DmThread participantId={selected} onRead={() => void mutate()} />
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = q ? rooms.filter((r) => r.nickname.toLowerCase().includes(q)) : rooms;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`수강생 ${rooms.length}명 중 찾기`} aria-label="수강생 찾기" className="pl-9" />
        </div>
      </div>
      <ul className="scrollbar-thin min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {rooms.length === 0 && <li className="p-4 text-sm text-muted-foreground">아직 입장한 수강생이 없어요.</li>}
        {rooms.length > 0 && shown.length === 0 && <li className="p-4 text-sm text-muted-foreground">찾는 수강생이 없어요.</li>}
        {shown.map((r) => (
          <li key={r.id}>
            <button className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-sunken/60" onClick={() => select(r.id)}>
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-ink" aria-hidden>
                {[...r.nickname][0]}
                <span className={cn("absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-surface", r.online ? "bg-signal-green" : "bg-border")} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate font-semibold">{r.nickname}</span>
                  {r.online && <span className="sr-only">접속 중</span>}
                  {r.thread && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{timeAgo(r.thread.lastAt)}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{r.thread?.lastBody ?? "대화 시작하기"}</span>
                  {(r.thread?.unread ?? 0) > 0 && (
                    <span className="shrink-0 rounded-full bg-coral px-1.5 text-xs font-semibold text-ink tabular-nums" aria-label={`안 읽음 ${r.thread?.unread}개`}>
                      {r.thread?.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
