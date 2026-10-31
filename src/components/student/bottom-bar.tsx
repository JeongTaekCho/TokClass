"use client";

import { useState } from "react";
import useSWR from "swr";
import { Hand, Info, Loader2 } from "lucide-react";
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

/**
 * 수강생 하단 고정: 이해도 신호등 + 도움 요청
 * - 이해도 신호등: 지금 수업을 잘 따라오는지 상태만 알려요. 강사 화면에는 반 전체 비율로 모이고(🔴가 기준을 넘으면 강조),
 *   수업 리포트의 시간대별 이해도 추이가 돼요. 다른 수강생에게는 보이지 않아요.
 * - 도움 요청: 강사님 대기열에 이름이 올라가서 직접 도움을 받는 손들기예요.
 */
export function BottomBar() {
  const { roomId, room, me } = useRoom();
  const { data: u, mutate: mutateU } = useSWR<{ status: UnderstandingStatus | null }>(`/api/rooms/${roomId}/understanding`, fetcher);
  const { data: h, mutate: mutateH } = useSWR<{ request: HelpRequest | null }>(`/api/rooms/${roomId}/help`, fetcher);
  const [helpOpen, setHelpOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

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
      const s = SIGNALS.find((x) => x.status === status);
      if (s && status !== prev) {
        toast.success(`강사님께 ${s.emoji} ${s.label}를 알렸어요.`, {
          description: status === "red" ? "직접 도움이 필요하면 [도움 요청]도 눌러 주세요." : "상태가 바뀌면 언제든 다시 눌러 주세요.",
        });
      }
    } catch (e) {
      void mutateU({ status: prev }, { revalidate: false });
      toastError(e);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="safe-bottom z-20 border-t border-border bg-card shadow-[0_-4px_16px_rgb(31_27_58/0.06)]">
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-3 pt-1.5 text-xs text-muted-foreground">
        <span id="understanding-caption">
          {current ? "지금 내 이해도를 강사님께 보여주고 있어요" : "지금 수업, 잘 따라오고 있나요? 눌러서 강사님께 알려 주세요"}
        </span>
        <button type="button" onClick={() => setAboutOpen(true)} className="inline-flex cursor-pointer items-center gap-0.5 font-semibold text-primary hover:underline">
          <Info className="size-3.5" aria-hidden /> 이게 뭐예요?
        </button>
      </div>
      <div className="mx-auto flex max-w-5xl items-stretch gap-1.5 p-2 pt-1" role="group" aria-label="지금 내 이해도" aria-describedby="understanding-caption">
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
            <DialogDescription>
              강사님 화면의 도움 요청 대기열에 이름이 올라가서, 강사님이 직접 도와줘요. 다른 수강생에게는 보이지 않아요. (🔴 막혔어요는 상태만 알리고, 도움 요청은 손을 드는 거예요.)
            </DialogDescription>
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
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이해도 신호등이란?</DialogTitle>
            <DialogDescription>수업을 듣는 동안 지금 내 상태를 강사님께 조용히 알리는 버튼이에요.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {SIGNALS.map((s) => (
              <li key={s.status} className="flex items-start gap-2">
                <span aria-hidden>{s.emoji}</span>
                <span>
                  <strong>{s.label}</strong> ·{" "}
                  {s.status === "green" ? "설명을 잘 따라가고 있을 때" : s.status === "yellow" ? "조금 헷갈리거나 다시 듣고 싶을 때" : "더 이상 따라가기 어려울 때"}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-1.5 rounded-xl bg-muted/60 p-3 text-sm">
            <p>· 강사님 화면에는 반 전체 비율로 모여요. 🔴가 많아지면 강사님 화면에 바로 강조돼서 설명을 다시 하거나 속도를 조절해요.</p>
            <p>· 다른 수강생에게는 보이지 않아요. 수업이 진행되면서 바뀌면 언제든 다시 눌러 주세요.</p>
            <p>· 직접 도움이 필요하면 오른쪽 [도움 요청]으로 손을 들어 주세요.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
