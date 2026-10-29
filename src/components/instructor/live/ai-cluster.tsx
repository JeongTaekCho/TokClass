"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import type { QuestionCluster } from "@/lib/ai/cluster";
import { useRoom } from "@/lib/realtime/provider";

type Status = { enabled: boolean; limit: number; remaining: number };

/** [질문 정리하기] (AI 질문 묶기·요약) */
export function AiClusterButton({ className }: { className?: string }) {
  const { roomId } = useRoom();
  const { data: status, mutate } = useSWR<Status>(`/api/rooms/${roomId}/ai/status`, fetcher);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [clusters, setClusters] = useState<QuestionCluster[] | null>(null);

  const disabled = !status?.enabled || status.remaining <= 0 || pending;
  const reason = !status ? "확인 중…" : !status.enabled ? "AI 키가 설정되지 않아 쓸 수 없어요 (README 참고)" : status.remaining <= 0 ? "오늘 한도를 다 썼어요" : `오늘 ${status.remaining}회 남았어요`;

  async function run() {
    setPending(true);
    try {
      const res = await api<{ clusters: QuestionCluster[] }>(`/api/rooms/${roomId}/ai/cluster`, { method: "POST" });
      setClusters(res.clusters);
      setOpen(true);
    } catch (e) {
      toastError(e);
    } finally {
      setPending(false);
      void mutate();
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className} tabIndex={disabled ? 0 : -1}>
            <Button size="sm" variant="soft" disabled={disabled} onClick={run} aria-describedby="ai-reason">
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />} 질문 정리하기
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent id="ai-reason">{reason}</TooltipContent>
      </Tooltip>
      {status && !status.enabled && <span className="sr-only">{reason}</span>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>✨ 비슷한 질문 묶음</DialogTitle>
            <DialogDescription>Q&A와 채팅 질문을 AI가 묶었어요. 많이 나온 순서예요.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3">
            {clusters?.map((c, i) => (
              <li key={i} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-primary">{c.title}</p>
                    <p className="font-bold">{c.representative}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-bold text-primary-hover">{c.count}개</span>
                </div>
                <details className="mt-2 text-sm text-muted-foreground">
                  <summary className="cursor-pointer">원래 질문 보기{c.votes > 0 && ` · 👍 ${c.votes}`}</summary>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {c.items.map((it, j) => (
                      <li key={j}>
                        {it.text} <span className="text-xs">({it.source === "qa" ? "Q&A" : "채팅"})</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
