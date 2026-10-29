"use client";

import { useState } from "react";
import useSWR from "swr";
import { Download, ExternalLink, EyeOff, Loader2, Send, Trash2, Trophy } from "lucide-react";

import { LinkPreview } from "@/components/room/link-preview";
import { MessageBody } from "@/components/room/message-body";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { timeAgo } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Submission, SubmissionComment } from "@/lib/types";
import { STICKERS } from "@/lib/validation/board";
import { cn } from "@/lib/utils";

export function SubmissionContent({ s, large = false }: { s: Submission; large?: boolean }) {
  return (
    <>
      {s.kind === "image" && s.fileUrl && <img src={s.fileUrl} alt={s.title || `${s.author.nickname}님의 이미지`} className={cn("w-full rounded-xl object-contain", large ? "max-h-[75dvh]" : "max-h-[60dvh] bg-muted")} />}
      {s.kind === "file" && s.fileUrl && (
        <a href={s.fileUrl} className="flex min-h-14 items-center gap-3 rounded-xl border border-border p-3 font-semibold hover:border-primary/40" target="_blank" rel="noopener noreferrer">
          <Download className="size-5 text-primary" aria-hidden /> {s.fileName ?? "파일 받기"}
        </a>
      )}
      {s.kind === "link" && s.url && (
        <div>
          <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className={cn("inline-flex items-center gap-1.5 font-semibold break-all text-primary underline", large && "text-2xl")}>
            <ExternalLink className="size-4 shrink-0" aria-hidden /> {s.url}
          </a>
          <LinkPreview url={s.url} />
        </div>
      )}
      {s.body && <MessageBody text={s.body} className={cn("mt-2", large && "text-xl leading-relaxed")} />}
    </>
  );
}

export function SubmissionDetail({ submission, onClose, onChanged }: { submission: Submission | null; onClose: () => void; onChanged: (s: Submission | null, removedId?: string) => void }) {
  const { roomId, me, room } = useRoom();
  const s = submission;
  const key = s ? `/api/rooms/${roomId}/submissions/${s.id}/comments` : null;
  const { data, mutate } = useSWR<{ comments: SubmissionComment[] }>(key, fetcher);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  useRoomEvent("submission.changed", ({ id }) => {
    if (s && id === s.id) void mutate();
  });
  const isInstructor = me.kind === "instructor";
  const active = room.status === "active";

  async function patch(body: Record<string, unknown>) {
    if (!s) return;
    try {
      const res = await api<{ submission: Submission }>(`/api/rooms/${roomId}/submissions/${s.id}`, { method: "PATCH", body });
      onChanged(res.submission);
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <Sheet open={Boolean(s)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
        {s && (
          <>
            <SheetHeader className="border-b border-border">
              <SheetTitle className="flex items-center gap-1.5">
                {s.isBest && <Trophy className="size-5 text-coral" aria-label="베스트" />}
                {s.title || "산출물"}
              </SheetTitle>
              <SheetDescription>
                {s.author.nickname} · {timeAgo(s.createdAt)}
                {s.section && ` · ${s.section}`}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 p-5">
              <SubmissionContent s={s} />

              <div className="flex flex-wrap gap-1.5" role="group" aria-label="스티커">
                {STICKERS.map((st) => {
                  const mine = s.myStickers.includes(st);
                  return (
                    <button
                      key={st}
                      disabled={!active}
                      onClick={async () => {
                        try {
                          const res = await api<{ submission: Submission }>(`/api/rooms/${roomId}/submissions/${s.id}/stickers`, { body: { sticker: st } });
                          onChanged(res.submission);
                        } catch (e) {
                          toastError(e);
                        }
                      }}
                      aria-pressed={mine}
                      aria-label={`${st} 스티커 ${s.stickers[st] ?? 0}개`}
                      className={cn("inline-flex min-h-10 min-w-12 cursor-pointer items-center justify-center gap-1 rounded-full border px-3 text-sm", mine ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40")}
                    >
                      {st} <span className="font-semibold">{s.stickers[st] ?? 0}</span>
                    </button>
                  );
                })}
              </div>

              {(isInstructor || s.mine) && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {isInstructor && (
                    <>
                      <Button size="sm" variant={s.isBest ? "coral" : "outline"} onClick={() => patch({ isBest: !s.isBest })}>
                        <Trophy aria-hidden /> {s.isBest ? "베스트 해제" : "베스트 선정"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => patch({ hidden: !s.hidden })}>
                        <EyeOff aria-hidden /> {s.hidden ? "다시 보이기" : "숨기기"}
                      </Button>
                    </>
                  )}
                  <ConfirmButton
                    title="산출물을 삭제할까요?"
                    description="댓글과 스티커도 함께 지워져요."
                    confirmLabel="삭제"
                    destructive
                    onConfirm={async () => {
                      try {
                        await api(`/api/rooms/${roomId}/submissions/${s.id}`, { method: "DELETE" });
                        onChanged(null, s.id);
                        onClose();
                      } catch (e) {
                        toastError(e);
                      }
                    }}
                  >
                    <Button size="sm" variant="ghost" className="text-destructive">
                      <Trash2 aria-hidden /> 삭제
                    </Button>
                  </ConfirmButton>
                </div>
              )}

              <section className="border-t border-border pt-4" aria-label="댓글">
                <h3 className="mb-2 font-bold">댓글 {data?.comments.length ?? ""}</h3>
                <ul className="space-y-2">
                  {data?.comments.map((c) => (
                    <li key={c.id} className="group flex items-start gap-2 text-sm">
                      <div className="flex-1 rounded-xl bg-muted px-3 py-2">
                        <span className={cn("mr-1.5 font-semibold", c.author.kind === "instructor" && "text-coral")}>{c.author.nickname}</span>
                        <span className="whitespace-pre-wrap">{c.body}</span>
                      </div>
                      {(c.mine || isInstructor) && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="댓글 삭제"
                          onClick={async () => {
                            try {
                              await api(`/api/rooms/${roomId}/submissions/${s.id}/comments/${c.id}`, { method: "DELETE" });
                              await mutate();
                            } catch (e) {
                              toastError(e);
                            }
                          }}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                {active && (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setPending(true);
                      try {
                        await api(`/api/rooms/${roomId}/submissions/${s.id}/comments`, { body: { body: text } });
                        setText("");
                        await mutate();
                        onChanged({ ...s, commentCount: s.commentCount + 1 });
                      } catch (err) {
                        toastError(err);
                      } finally {
                        setPending(false);
                      }
                    }}
                  >
                    <Input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="따뜻한 피드백을 남겨요" aria-label="댓글 입력" />
                    <Button type="submit" size="icon" aria-label="댓글 보내기" disabled={pending || !text.trim()}>
                      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                    </Button>
                  </form>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
