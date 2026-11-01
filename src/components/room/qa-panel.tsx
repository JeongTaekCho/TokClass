"use client";

import { useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { CheckCircle2, Loader2, ThumbsUp } from "lucide-react";

import { AiClusterButton } from "@/components/instructor/live/ai-cluster";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { QaEmptyArt } from "@/components/illustrations";
import { QuestionListSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { timeAgo } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";

type Sort = "popular" | "recent";
type Filter = "all" | "open" | "answered";

export function QaPanel({ readOnly = false }: { readOnly?: boolean }) {
  const { roomId, me, room } = useRoom();
  const key = `/api/rooms/${roomId}/questions`;
  const { data, mutate, isLoading } = useSWR<{ questions: Question[] }>(key, fetcher);
  const [sort, setSort] = useState<Sort>("popular");
  const [filter, setFilter] = useState<Filter>("all");
  const refetchTimer = useRef<number | null>(null);
  const isInstructor = me.kind === "instructor";

  useRoomEvent("qa.changed", ({ id, question }) => {
    if (isInstructor) {
      // 강사는 작성자 공개 설정·숨김 여부까지 반영하려고 다시 받아와요 (잦은 공감에 대비해 묶어서).
      if (refetchTimer.current) return;
      refetchTimer.current = window.setTimeout(() => {
        refetchTimer.current = null;
        void mutate();
      }, 500);
      return;
    }
    if (!data) {
      void mutate();
      return;
    }
    void mutate(
      (prev) => {
        const list = prev?.questions ?? [];
        if (!question) return { questions: list.filter((q) => q.id !== id) };
        const existing = list.find((q) => q.id === id);
        const merged: Question = existing ? { ...question, mine: existing.mine, voted: existing.voted } : question;
        return { questions: existing ? list.map((q) => (q.id === id ? merged : q)) : [merged, ...list] };
      },
      { revalidate: false },
    );
  });

  const questions = useMemo(() => {
    let list = [...(data?.questions ?? [])];
    if (filter === "open") list = list.filter((q) => !q.answered);
    if (filter === "answered") list = list.filter((q) => q.answered);
    list.sort((a, b) => {
      if (sort === "popular") {
        if (a.answered !== b.answered) return a.answered ? 1 : -1;
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
    return list;
  }, [data, sort, filter]);

  const canAsk = !readOnly && !isInstructor && room.status === "active";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {canAsk && <AskForm roomId={roomId} onAsked={(q) => mutate((prev) => ({ questions: [q, ...(prev?.questions ?? []).filter((x) => x.id !== q.id)] }), { revalidate: false })} />}
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
        {(["popular", "recent"] as const).map((s) => (
          <Button key={s} size="sm" variant={sort === s ? "soft" : "ghost"} aria-pressed={sort === s} onClick={() => setSort(s)}>
            {s === "popular" ? "공감순" : "최신순"}
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {(["all", "open", "answered"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "soft" : "ghost"} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "전체" : f === "open" ? "미답변" : "답변 완료"}
          </Button>
        ))}
        {isInstructor && !readOnly && <AiClusterButton className="ml-auto" />}
      </div>
      <ul className="scrollbar-thin min-h-0 flex-1 divide-y divide-border overflow-y-auto px-3" aria-label="질문 목록">
        {isLoading && <QuestionListSkeleton />}
        {!isLoading && questions.length === 0 && (
          <li>
            <EmptyState art={<QaEmptyArt />} title="아직 질문이 없어요">
              궁금한 건 편하게 물어보세요!
            </EmptyState>
          </li>
        )}
        {questions.map((q) => (
          <QuestionItem key={q.id} q={q} roomId={roomId} isInstructor={isInstructor} readOnly={readOnly || room.status === "ended"} onChange={(next) => mutate((prev) => ({ questions: (prev?.questions ?? []).map((x) => (x.id === next.id ? next : x)) }), { revalidate: false })} onRemove={(id) => mutate((prev) => ({ questions: (prev?.questions ?? []).filter((x) => x.id !== id) }), { revalidate: false })} />
        ))}
      </ul>
    </div>
  );
}

function AskForm({ roomId, onAsked }: { roomId: string; onAsked: (q: Question) => void }) {
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="space-y-2 border-b border-border bg-surface p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        try {
          const res = await api<{ question: Question }>(`/api/rooms/${roomId}/questions`, { body: { body, anonymous } });
          onAsked(res.question);
          setBody("");
        } catch (err) {
          toastError(err);
        } finally {
          setPending(false);
        }
      }}
    >
      <Textarea value={body} maxLength={500} onChange={(e) => setBody(e.target.value)} placeholder="궁금한 점을 질문해요. 다른 사람이 공감하면 위로 올라가요." aria-label="질문 입력" className="min-h-16" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Checkbox id="qa-anon" checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} />
          <Label htmlFor="qa-anon">익명으로 질문</Label>
        </div>
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}질문하기
        </Button>
      </div>
    </form>
  );
}

function QuestionItem({
  q,
  roomId,
  isInstructor,
  readOnly,
  onChange,
  onRemove,
}: {
  q: Question;
  roomId: string;
  isInstructor: boolean;
  readOnly: boolean;
  onChange: (q: Question) => void;
  onRemove: (id: string) => void;
}) {
  const [answering, setAnswering] = useState(false);
  const [answer, setAnswer] = useState(q.answer ?? "");

  async function patch(body: Record<string, unknown>) {
    try {
      const res = await api<{ question: Question }>(`/api/rooms/${roomId}/questions/${q.id}`, { method: "PATCH", body });
      onChange(res.question);
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <li className={cn("animate-enter-up py-3", q.hidden && "-mx-3 bg-sunken px-3")}>
      <div className="flex items-start gap-2">
        {!isInstructor ? (
          <button
            onClick={async () => {
              if (q.mine || readOnly) return;
              try {
                const res = await api<{ question: Question }>(`/api/rooms/${roomId}/questions/${q.id}/vote`, { method: "POST" });
                onChange(res.question);
              } catch (e) {
                toastError(e);
              }
            }}
            disabled={q.mine || readOnly}
            aria-pressed={q.voted}
            aria-label={`공감 ${q.voteCount}개${q.voted ? ", 내가 공감함" : ""}`}
            className={cn(
              "press flex min-h-11 min-w-11 shrink-0 cursor-pointer flex-col items-center justify-center rounded-md border text-xs font-semibold tabular-nums transition-colors disabled:cursor-default",
              q.voted ? "border-primary bg-primary-soft text-primary-ink" : "border-border-strong bg-surface hover:border-primary",
            )}
          >
            <ThumbsUp className="size-4" aria-hidden />
            {q.voteCount}
          </button>
        ) : (
          <span className="flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center rounded-md bg-sunken text-xs font-semibold tabular-nums" aria-label={`공감 ${q.voteCount}개`}>
            <ThumbsUp className="size-4" aria-hidden />
            {q.voteCount}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{q.author ? q.author.nickname : "익명"}</span>
            {q.anonymous && q.author && <Badge variant="outline">익명 질문</Badge>}
            {q.mine && <Badge variant="soft">내 질문</Badge>}
            {q.page && <Badge variant="secondary">p.{q.page}</Badge>}
            {q.answered && (
              <Badge variant="success">
                <CheckCircle2 aria-hidden /> 답변 완료
              </Badge>
            )}
            {q.hidden && <Badge variant="coral-soft">숨김</Badge>}
            <span>{timeAgo(q.createdAt)}</span>
          </div>
          <p className={cn("whitespace-pre-wrap", q.answered && "text-muted-foreground")}>{q.body}</p>
          {q.answer && !answering && (
            <p className="mt-2 border-l-2 border-primary pl-3 text-sm whitespace-pre-wrap">
              <span className="font-semibold text-primary-ink">강사 답변 </span>
              {q.answer}
            </p>
          )}
          {isInstructor && !readOnly && answering && (
            <form
              className="mt-2 space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await patch({ answer });
                setAnswering(false);
              }}
            >
              <Textarea value={answer} maxLength={1000} onChange={(e) => setAnswer(e.target.value)} placeholder="답변을 적어요 (말로 답했다면 비워 두고 [답변 완료]만 눌러도 돼요)" aria-label="답변 입력" autoFocus />
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  답변 저장
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAnswering(false)}>
                  취소
                </Button>
              </div>
            </form>
          )}
          <div className="mt-1.5 -ml-3 flex flex-wrap gap-0.5">
            {isInstructor && !readOnly && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setAnswering((v) => !v)}>
                  답변
                </Button>
                <Button size="sm" variant={q.answered ? "soft" : "ghost"} onClick={() => patch({ answered: !q.answered })}>
                  {q.answered ? "답변 완료 취소" : "답변 완료"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => patch({ hidden: !q.hidden })}>
                  {q.hidden ? "보이기" : "숨기기"}
                </Button>
              </>
            )}
            {q.mine && !readOnly && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (!confirm("질문을 지울까요?")) return;
                  try {
                    await api(`/api/rooms/${roomId}/questions/${q.id}`, { method: "DELETE" });
                    onRemove(q.id);
                  } catch (e) {
                    toastError(e);
                  }
                }}
              >
                지우기
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
