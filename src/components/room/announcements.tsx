"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDown, Megaphone, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { timeAgo } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Announcement } from "@/lib/types";
import { cn } from "@/lib/utils";

export function useAnnouncements() {
  const { roomId } = useRoom();
  const key = `/api/rooms/${roomId}/announcements`;
  const swr = useSWR<{ announcements: Announcement[] }>(key, fetcher, { revalidateOnFocus: false });
  useRoomEvent("announce.changed", ({ announcements }) => void swr.mutate({ announcements }, { revalidate: false }));
  return swr;
}

/** 상단 고정 공지 (수강생·강사 공용) */
export function AnnouncementBar() {
  const { data } = useAnnouncements();
  const [open, setOpen] = useState(false);
  const list = data?.announcements ?? [];
  if (list.length === 0) return null;
  const [latest, ...rest] = list;
  return (
    <div className="border-b border-border bg-coral-soft/70" role="region" aria-label="공지">
      <div className="mx-auto flex max-w-5xl items-start gap-2 px-4 py-2">
        <Megaphone className="mt-1 size-4 shrink-0 text-coral" aria-hidden />
        <div className="min-w-0 flex-1 text-sm">
          <p className={cn("font-medium whitespace-pre-wrap", !open && "line-clamp-2")}>{latest!.body}</p>
          {open &&
            rest.map((a) => (
              <p key={a.id} className="mt-1.5 border-t border-coral/20 pt-1.5 whitespace-pre-wrap text-muted-foreground">
                {a.body} <span className="text-xs">· {timeAgo(a.createdAt)}</span>
              </p>
            ))}
        </div>
        {(rest.length > 0 || latest!.body.length > 60) && (
          <button
            className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-0.5 rounded-md px-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? "접기" : rest.length > 0 ? `공지 ${list.length}개` : "더보기"}
            <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/** 강사 공지 관리 */
export function AnnouncementManager() {
  const { roomId } = useRoom();
  const { data, mutate } = useAnnouncements();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="space-y-3">
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          try {
            const res = await api<{ announcements: Announcement[] }>(`/api/rooms/${roomId}/announcements`, { body: { body: text } });
            await mutate(res, { revalidate: false });
            setText("");
          } catch (err) {
            toastError(err);
          } finally {
            setPending(false);
          }
        }}
      >
        <Textarea value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="모두에게 보일 공지를 써요" aria-label="공지 내용" />
        <Button type="submit" size="sm" disabled={pending || !text.trim()}>
          <Megaphone aria-hidden /> 공지 올리기
        </Button>
      </form>
      <ul className="space-y-2">
        {(data?.announcements ?? []).map((a) => (
          <li key={a.id} className="flex items-start gap-2 rounded-xl border border-border bg-card p-2.5 text-sm">
            <p className="flex-1 whitespace-pre-wrap">{a.body}</p>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="공지 삭제"
              onClick={async () => {
                try {
                  const res = await api<{ announcements: Announcement[] }>(`/api/rooms/${roomId}/announcements/${a.id}`, { method: "DELETE" });
                  await mutate(res, { revalidate: false });
                } catch (err) {
                  toastError(err);
                }
              }}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
