"use client";

import useSWR from "swr";
import { Hand, Loader2 } from "lucide-react";

import { SIGNALS } from "@/components/room/signal";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fetcher } from "@/lib/client/api";
import { formatDateTime, timeAgo } from "@/lib/format";

import { STATE_LABEL, type ManageParticipant, type ManageRoom, type ParticipantState } from "./types";

type Detail = {
  counts: { chats: number; questions: number; submissions: number; responses: number };
  understanding: { green: number; yellow: number; red: number; current: "green" | "yellow" | "red" | null; updatedAt: string | null };
  help: { id: string; message: string; status: "open" | "resolved"; createdAt: string; resolvedAt: string | null }[];
};

export function ParticipantDetail({
  participant,
  room,
  state,
  onOpenChange,
}: {
  participant: ManageParticipant | null;
  room: ManageRoom | undefined;
  state: ParticipantState;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useSWR<Detail>(participant ? `/api/manage/participants/${participant.id}` : null, fetcher);
  const u = data?.understanding;
  const uTotal = u ? u.green + u.yellow + u.red : 0;
  const current = SIGNALS.find((s) => s.status === u?.current);

  return (
    <Sheet open={Boolean(participant)} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 overflow-y-auto p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{participant?.nickname}</SheetTitle>
          <SheetDescription>
            {room?.title} · {STATE_LABEL[state]}
          </SheetDescription>
        </SheetHeader>
        {participant && (
          <div className="space-y-6 p-4">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">참여일</dt>
                <dd>{formatDateTime(participant.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">마지막 활동</dt>
                <dd>{timeAgo(participant.lastActiveAt)}</dd>
              </div>
            </dl>

            {isLoading || !data ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden /> 불러오는 중이에요
              </p>
            ) : (
              <>
                <section aria-labelledby="pd-activity">
                  <h3 id="pd-activity" className="mb-2 font-bold">
                    활동
                  </h3>
                  <dl className="grid grid-cols-2 gap-2">
                    {[
                      { label: "채팅", value: data.counts.chats },
                      { label: "질문", value: data.counts.questions },
                      { label: "산출물", value: data.counts.submissions },
                      { label: "활동 응답", value: data.counts.responses },
                    ].map((c) => (
                      <div key={c.label} className="rounded-xl bg-muted/60 p-3">
                        <dt className="text-xs text-muted-foreground">{c.label}</dt>
                        <dd className="text-xl font-bold">{c.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section aria-labelledby="pd-understanding">
                  <h3 id="pd-understanding" className="mb-2 font-bold">
                    이해도 기록
                  </h3>
                  <p className="mb-2 text-sm">
                    지금: {current ? `${current.emoji} ${current.short}` : <span className="text-muted-foreground">표시 안 함</span>}
                  </p>
                  {uTotal === 0 ? (
                    <p className="text-sm text-muted-foreground">아직 기록이 없어요.</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm">
                      {SIGNALS.map((s) => {
                        const n = u ? u[s.status] : 0;
                        return (
                          <li key={s.status} className="flex items-center gap-2">
                            <span className="w-16 shrink-0">
                              {s.emoji} {s.short}
                            </span>
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                              <span className="block h-full bg-primary" style={{ width: `${Math.round((n / uTotal) * 100)}%` }} />
                            </span>
                            <span className="w-10 text-right tabular-nums">{n}회</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section aria-labelledby="pd-help">
                  <h3 id="pd-help" className="mb-2 font-bold">
                    도움 요청 이력
                  </h3>
                  {data.help.length === 0 ? (
                    <p className="text-sm text-muted-foreground">도움 요청이 없었어요.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {data.help.map((h) => (
                        <li key={h.id} className="rounded-xl border border-border p-2.5">
                          <p className="flex items-center gap-1.5">
                            <Hand className="size-3.5 text-coral" aria-hidden />
                            {h.message || "(메시지 없음)"}
                            {h.status === "open" && (
                              <Badge variant="coral-soft" className="ml-auto">
                                대기 중
                              </Badge>
                            )}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(h.createdAt)}
                            {h.resolvedAt && ` · ${formatDateTime(h.resolvedAt)} 해결`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
