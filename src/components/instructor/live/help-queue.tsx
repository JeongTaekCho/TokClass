"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";

import { Check, CheckCheck } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { QaEmptyArt } from "@/components/illustrations";
import { AnimatePresence, PresenceItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { timeAgo } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { HelpRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HelpQueue({ onCount }: { onCount?: (n: number) => void }) {
  const { roomId } = useRoom();
  const { data, mutate } = useSWR<{
    open: HelpRequest[];
    resolved: HelpRequest[];
  }>(`/api/rooms/${roomId}/help`, fetcher);
  useRoomEvent("help.changed", ({ status }) => {
    void mutate();
    if (status === "open") toast("✋ 새 도움 요청이 왔어요");
  });
  const open = data?.open ?? [];
  useEffect(() => onCount?.(open.length), [open.length, onCount]);

  async function resolve(id: string) {
    // 누르자마자 대기열에서 빼고(낙관적 업데이트), 실패하면 다시 받아 와요.
    const done = data?.open.find((r) => r.id === id);
    void mutate((prev) => prev && { open: prev.open.filter((r) => r.id !== id), resolved: done ? [{ ...done, status: "resolved" as const }, ...prev.resolved].slice(0, 10) : prev.resolved }, { revalidate: false });
    try {
      await api(`/api/rooms/${roomId}/help/${id}`, {
        method: "PATCH",
        body: { status: "resolved" },
      });
    } catch (e) {
      toastError(e);
    } finally {
      void mutate();
    }
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 font-bold">
          대기 중 <span className="text-muted-foreground tabular-nums">{open.length}</span>
        </h3>
        {open.length === 0 && (
          <EmptyState art={<QaEmptyArt />} title="기다리는 수강생이 없어요">
            수강생이 ✋ 도움 요청을 누르면 여기에 차례대로 쌓여요.
          </EmptyState>
        )}
        <ol className="space-y-2">
          <AnimatePresence initial={false}>
            {open.map((r, i) => (
              <PresenceItem
                key={r.id}
                className={cn("flex items-start gap-3 rounded-lg border p-3", i === 0 ? "border-coral/40 bg-coral-soft" : "border-border bg-surface shadow-card")}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-coral text-sm font-bold text-ink tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {r.nickname}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">{timeAgo(r.createdAt)}</span>
                  </p>
                  {r.message && <p className="text-sm">{r.message}</p>}
                </div>
                <Button size="sm" onClick={() => resolve(r.id)}>
                  <Check aria-hidden /> 처리 완료
                </Button>
              </PresenceItem>
            ))}
          </AnimatePresence>
        </ol>
      </section>
      {(data?.resolved.length ?? 0) > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">최근 처리</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {data!.resolved.map((r) => (
              <li key={r.id}>
                <CheckCheck aria-hidden className="mr-1 inline size-3.5 text-success" />
                {r.nickname} {r.message && `· ${r.message}`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
