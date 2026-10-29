"use client";

import { useState } from "react";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";

import { DmThread } from "@/components/room/dm-thread";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/client/api";
import { timeAgo } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";

type Thread = { participantId: string; lastBody: string; lastAt: string; unread: number };
type ParticipantLite = { id: string; nickname: string };

/** 강사 1:1 메시지함: 대화 목록 + 새 대화 */
export function DmInbox({ openWith, onOpenChange }: { openWith?: string | null; onOpenChange?: (id: string | null) => void }) {
  const { roomId } = useRoom();
  const [selfSelected, setSelfSelected] = useState<string | null>(null);
  const selected = openWith !== undefined ? openWith : selfSelected;
  const select = (id: string | null) => (onOpenChange ? onOpenChange(id) : setSelfSelected(id));
  const { data, mutate } = useSWR<{ threads: Thread[] }>(`/api/rooms/${roomId}/dms`, fetcher);
  const { data: pData } = useSWR<{ participants: ParticipantLite[] }>(`/api/rooms/${roomId}/participants`, fetcher);
  useRoomEvent("dm.new", () => void mutate());
  const names = new Map((pData?.participants ?? []).map((p) => [p.id, p.nickname]));

  if (selected) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <Button variant="ghost" size="icon-sm" aria-label="목록으로" onClick={() => select(null)}>
            <ArrowLeft aria-hidden />
          </Button>
          <span className="font-semibold">{names.get(selected) ?? "수강생"}님과 1:1</span>
        </div>
        <DmThread participantId={selected} onRead={() => void mutate()} />
      </div>
    );
  }

  const threads = data?.threads ?? [];
  const withThread = new Set(threads.map((t) => t.participantId));
  return (
    <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <ul className="space-y-1.5">
        {threads.length === 0 && <li className="text-sm text-muted-foreground">아직 1:1 대화가 없어요.</li>}
        {threads.map((t) => (
          <li key={t.participantId}>
            <button className="flex w-full cursor-pointer items-start gap-2 rounded-xl border border-border bg-card p-2.5 text-left hover:border-primary/40" onClick={() => select(t.participantId)}>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{names.get(t.participantId) ?? "수강생"}</span>
                <span className="block truncate text-sm text-muted-foreground">{t.lastBody}</span>
              </span>
              <span className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                {timeAgo(t.lastAt)}
                {t.unread > 0 && <span className="rounded-full bg-coral px-1.5 font-bold text-white">{t.unread}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div>
        <p className="mb-1.5 text-sm font-semibold">새 대화 시작</p>
        <div className="flex flex-wrap gap-1.5">
          {(pData?.participants ?? [])
            .filter((p) => !withThread.has(p.id))
            .map((p) => (
              <Button key={p.id} variant="outline" size="sm" onClick={() => select(p.id)}>
                {p.nickname}
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
}
