"use client";

import { useState } from "react";
import useSWR from "swr";
import { Hand, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SIGNALS } from "@/components/room/signal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { HelpRequest, UnderstandingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 수강생 하단 고정: 이해도 신호등 + 도움 요청 */
export function BottomBar() {
  const { roomId, room, me } = useRoom();
  const { data: u, mutate: mutateU } = useSWR<{ status: UnderstandingStatus | null }>(`/api/rooms/${roomId}/understanding`, fetcher);
  const { data: h, mutate: mutateH } = useSWR<{ request: HelpRequest | null }>(`/api/rooms/${roomId}/help`, fetcher);
  const [helpOpen, setHelpOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  useRoomEvent("understanding.counts", ({ reset }) => {
    if (reset) {
      void mutateU({ status: null }, { revalidate: false });
      toast("강사님이 이해도 표시를 새로 시작했어요. 지금 상태를 다시 알려 주세요!");
    }
  });
  useRoomEvent("help.changed", ({ participantId, status }) => {
    if (participantId === me.id) {
      void mutateH();
      if (status === "resolved") toast.success("강사님이 도움 요청을 확인했어요.");
    }
  });

  if (room.status === "ended") return null;
  const current = u?.status ?? null;
  const open = h?.request ?? null;

  async function setStatus(status: UnderstandingStatus) {
    setPending(status);
    const prev = current;
    void mutateU({ status }, { revalidate: false });
    try {
      await api(`/api/rooms/${roomId}/understanding`, { body: { status } });
    } catch (e) {
      void mutateU({ status: prev }, { revalidate: false });
      toastError(e);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="safe-bottom z-20 border-t border-border bg-card shadow-[0_-4px_16px_rgb(31_27_58/0.06)]">
      <div className="mx-auto flex max-w-5xl items-stretch gap-1.5 p-2" role="group" aria-label="지금 내 이해도">
        {SIGNALS.map((s) => {
          const active = current === s.status;
          return (
            <button
              key={s.status}
              onClick={() => setStatus(s.status)}
              aria-pressed={active}
              disabled={pending !== null}
              className={cn(
                "flex min-h-12 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-1 text-[13px] leading-tight font-semibold transition sm:flex-row sm:gap-1.5 sm:text-sm",
                active ? s.soft : "border-transparent bg-muted text-muted-foreground hover:bg-primary-soft",
              )}
            >
              <span className="text-lg sm:text-base" aria-hidden>
                {s.emoji}
              </span>
              {s.label}
            </button>
          );
        })}
        <button
          onClick={() => {
            if (open) {
              api(`/api/rooms/${roomId}/help/${open.id}`, { method: "PATCH", body: { status: "resolved" } })
                .then(() => mutateH({ request: null }, { revalidate: false }))
                .catch(toastError);
            } else setHelpOpen(true);
          }}
          aria-pressed={Boolean(open)}
          className={cn(
            "flex min-h-12 min-w-[4.5rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-2 text-[13px] leading-tight font-semibold transition sm:flex-row sm:gap-1.5 sm:text-sm",
            open ? "animate-pulse border-coral bg-coral text-white" : "border-coral/40 bg-coral-soft text-[#c2410c] hover:border-coral",
          )}
        >
          <Hand className="size-5 sm:size-4" aria-hidden />
          {open ? "요청 취소" : "도움 요청"}
        </button>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✋ 도움 요청</DialogTitle>
            <DialogDescription>강사님 화면의 도움 요청 대기열에 올라가요. 다른 수강생에게는 보이지 않아요.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await api<{ request: HelpRequest }>(`/api/rooms/${roomId}/help`, { body: { message } });
                await mutateH({ request: res.request }, { revalidate: false });
                setHelpOpen(false);
                setMessage("");
                toast.success("도움을 요청했어요. 강사님이 곧 확인할 거예요.");
              } catch (err) {
                toastError(err);
              }
            }}
          >
            <Input value={message} maxLength={200} onChange={(e) => setMessage(e.target.value)} placeholder="(선택) 어디서 막혔는지 짧게 적어 주세요" aria-label="도움 요청 메시지" />
            <DialogFooter>
              <Button type="submit" variant="coral">
                {pending && <Loader2 className="animate-spin" aria-hidden />}손들기
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
