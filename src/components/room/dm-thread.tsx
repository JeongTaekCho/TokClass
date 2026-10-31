"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { formatTime } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { DirectMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 강사 ↔ 수강생 1:1 대화. 강사 화면이면 participantId를 넘겨요. */
export function DmThread({ participantId, onRead }: { participantId?: string; onRead?: () => void }) {
  const { roomId, me, room } = useRoom();
  const key = participantId ? `/api/rooms/${roomId}/dms?participantId=${participantId}` : `/api/rooms/${roomId}/dms?markRead=1`;
  const { data, mutate, isLoading } = useSWR<{ messages: DirectMessage[] }>(key, fetcher);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useRoomEvent("dm.new", (p) => {
    if (me.kind === "participant" ? p.participantId === me.id : p.participantId === participantId) void mutate();
  });
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    if (data) onRead?.();
  }, [data, onRead]);

  const mineIsInstructor = me.kind === "instructor";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {isLoading && <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" aria-label="불러오는 중" />}
        {data?.messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">{mineIsInstructor ? "이 수강생에게만 보이는 메시지를 보내요." : "궁금한 점을 강사님께 따로 물어볼 수 있어요. 다른 수강생에게는 보이지 않아요."}</p>
        )}
        {data?.messages.map((m) => {
          const mine = m.fromInstructor === mineIsInstructor;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] whitespace-pre-wrap", mine ? "bg-primary text-primary-foreground" : "bg-coral-soft")}>{m.body}</div>
              <time className="mt-0.5 px-1 text-xs text-muted-foreground">{formatTime(m.createdAt)}</time>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {room.status === "active" && (
        <form
          className="flex items-end gap-1.5 border-t border-border p-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            setPending(true);
            try {
              await api(`/api/rooms/${roomId}/dms`, { body: { participantId, body: text } });
              setText("");
              await mutate();
            } catch (err) {
              toastError(err);
            } finally {
              setPending(false);
            }
          }}
        >
          <Textarea
            rows={1}
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={mineIsInstructor ? "1:1 메시지" : "강사님께 메시지 보내기"}
            aria-label="1:1 메시지 입력"
            className="max-h-32 min-h-11 flex-1 resize-none py-2.5"
          />
          <Button type="submit" size="icon" aria-label="보내기" disabled={pending || !text.trim()}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          </Button>
        </form>
      )}
    </div>
  );
}
