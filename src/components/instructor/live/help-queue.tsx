"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { CheckCircle2, Hand } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { timeAgo } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { HelpRequest } from "@/lib/types";

export function HelpQueue({ onCount }: { onCount?: (n: number) => void }) {
  const { roomId } = useRoom();
  const { data, mutate } = useSWR<{ open: HelpRequest[]; resolved: HelpRequest[] }>(`/api/rooms/${roomId}/help`, fetcher);
  useRoomEvent("help.changed", ({ status }) => {
    void mutate();
    if (status === "open") toast("✋ 새 도움 요청이 왔어요");
  });
  const open = data?.open ?? [];
  useEffect(() => onCount?.(open.length), [open.length, onCount]);

  async function resolve(id: string) {
    try {
      await api(`/api/rooms/${roomId}/help/${id}`, { method: "PATCH", body: { status: "resolved" } });
      await mutate();
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 font-bold">대기 중 ({open.length})</h3>
        {open.length === 0 && <p className="text-sm text-muted-foreground">도움을 기다리는 수강생이 없어요 🙌</p>}
        <ol className="space-y-2">
          {open.map((r, i) => (
            <li key={r.id} className="flex items-start gap-2 rounded-xl border border-coral/40 bg-coral-soft p-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-bold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  <Hand className="mr-1 inline size-4 text-coral" aria-hidden />
                  {r.nickname}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">{timeAgo(r.createdAt)}</span>
                </p>
                {r.message && <p className="text-sm">{r.message}</p>}
              </div>
              <Button size="sm" onClick={() => resolve(r.id)}>
                <CheckCircle2 aria-hidden /> 처리 완료
              </Button>
            </li>
          ))}
        </ol>
      </section>
      {(data?.resolved.length ?? 0) > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold text-muted-foreground">최근 처리</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {data!.resolved.map((r) => (
              <li key={r.id}>
                ✓ {r.nickname} {r.message && `· ${r.message}`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
