"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Loader2, Send } from "lucide-react";

import { DayDivider } from "@/components/room/chat-message";
import { ChatSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { formatDay, formatTime } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { DirectMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

/** clientKey: 보낸 말풍선이 임시 id → 실제 id로 바뀌어도 같은 key를 써서 다시 그려지지(깜빡이지) 않게 해요. */
type Msg = DirectMessage & { clientKey?: string };

/** 강사 ↔ 수강생 1:1 대화. 강사 화면이면 participantId를 넘겨요. */
export function DmThread({ participantId, onRead }: { participantId?: string; onRead?: () => void }) {
  const { roomId, me, room } = useRoom();
  const key = participantId ? `/api/rooms/${roomId}/dms?participantId=${participantId}` : `/api/rooms/${roomId}/dms?markRead=1`;
  const { data, mutate, isLoading } = useSWR<{ messages: Msg[] }>(key, fetcher);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const [mountedAt] = useState(() => Date.now());
  const mineIsInstructor = me.kind === "instructor";
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  });

  useRoomEvent("dm.new", (p) => {
    // 내가 보낸 건 이미 화면에 있어서 다시 불러오지 않아요.
    if (p.fromInstructor === mineIsInstructor) return;
    if (me.kind === "participant" ? p.participantId === me.id : p.participantId === participantId) void mutate();
  });
  const count = data?.messages.length ?? 0;
  const loaded = Boolean(data);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count]);
  useEffect(() => {
    if (loaded) onReadRef.current?.();
  }, [loaded, count]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-primary-soft/30 to-background px-3 pt-1 pb-4 sm:px-4">
        {isLoading && <ChatSkeleton rows={3} />}
        {data?.messages.length === 0 && (
          <p className="mx-auto mt-10 max-w-[18rem] rounded-2xl bg-surface px-4 py-3 text-center text-sm text-muted-foreground shadow-card">
            {mineIsInstructor ? "이 수강생에게만 보이는 메시지를 보내요." : "궁금한 점을 강사님께 따로 물어볼 수 있어요. 다른 수강생에게는 보이지 않아요."}
          </p>
        )}
        {data?.messages.map((m, i, all) => {
          const mine = m.fromInstructor === mineIsInstructor;
          const prev = all[i - 1];
          const next = all[i + 1];
          const sameRun = (a?: Msg, b?: Msg) => !!a && !!b && a.fromInstructor === b.fromInstructor && formatDay(a.createdAt) === formatDay(b.createdAt) && Date.parse(b.createdAt) - Date.parse(a.createdAt) < 5 * 60_000;
          const first = !sameRun(prev, m);
          const last = !sameRun(m, next);
          const pending = m.id.startsWith("pending-");
          return (
            <Fragment key={m.clientKey ?? m.id}>
              {(!prev || formatDay(prev.createdAt) !== formatDay(m.createdAt)) && <DayDivider iso={m.createdAt} />}
              <div className={cn("flex flex-col", mine ? "items-end" : "items-start", first ? "pt-3" : "pt-0.5", pending && "opacity-70", Date.parse(m.createdAt) >= mountedAt && "animate-enter-up")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-[22px] px-4 py-2.5 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]",
                    mine ? cn("rounded-br-md bg-brand text-primary-foreground shadow-brand", !first && "rounded-tr-md") : cn("rounded-bl-md bg-surface text-foreground shadow-card ring-1 ring-border/60", !first && "rounded-tl-md"),
                  )}
                >
                  {m.body}
                </div>
                {pending ? (
                  <Loader2 className="mt-1 size-3.5 animate-spin text-muted-foreground motion-reduce:animate-none" role="status" aria-label="보내는 중" />
                ) : (
                  last && (
                    <time dateTime={m.createdAt} className="mt-1 px-1 text-[11px] text-muted-foreground tabular-nums">
                      {formatTime(m.createdAt)}
                    </time>
                  )
                )}
              </div>
            </Fragment>
          );
        })}
        <div ref={endRef} />
      </div>
      {room.status === "active" && (
        <form
          className="bg-background px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_24px_-16px_rgb(79_70_229/0.18)] sm:px-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const body = text.trim();
            if (!body) return;
            // 보내는 말풍선을 바로 띄우고 입력창을 비워요(낙관적 업데이트). 실패하면 글을 되돌려 놓아요.
            const temp: DirectMessage = { id: `pending-${crypto.randomUUID()}`, participantId: participantId ?? me.id, fromInstructor: mineIsInstructor, body, createdAt: new Date().toISOString(), readAt: null };
            setText("");
            try {
              await mutate(
                async (prev) => {
                  const res = await api<{ message: DirectMessage }>(`/api/rooms/${roomId}/dms`, { body: { participantId, body } });
                  // 서버 응답으로 임시 말풍선만 바꿔 끼워요(전체를 다시 불러오지 않아요).
                  const rest = (prev?.messages ?? []).filter((x) => x.id !== res.message.id);
                  return { messages: [...rest, { ...res.message, clientKey: temp.id }] };
                },
                { optimisticData: (prev) => ({ messages: [...(prev?.messages ?? []), temp] }), rollbackOnError: true, revalidate: false, populateCache: true },
              );
            } catch (err) {
              setText((t) => (t ? t : body));
              toastError(err);
            }
          }}
        >
          <div className="flex items-end gap-1 rounded-[26px] border border-border-strong bg-surface p-1.5 shadow-card transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
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
            className="max-h-32 min-h-9 flex-1 resize-none rounded-none border-0 bg-transparent px-3 py-2 text-base leading-snug shadow-none hover:border-0 focus-visible:ring-0"
          />
          <Button type="submit" size="icon" className="size-9 shrink-0 rounded-full" aria-label="보내기" disabled={!text.trim()}>
            <Send aria-hidden />
          </Button>
          </div>
        </form>
      )}
    </div>
  );
}
