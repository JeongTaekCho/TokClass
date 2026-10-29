"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Countdown, useRemaining } from "@/components/room/activities/timer";
import { IDEA_COLOR_KEYS, ideaColorClass, ResultsView } from "@/components/room/activities/results-view";
import { useActivityDetail, type ActivityDetail } from "@/components/room/activities/use-activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { useRoom } from "@/lib/realtime/provider";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 수강생이 활동에 참여하는 화면 */
export function ActivityRunner({ activityId }: { activityId: string }) {
  const { data, mutate, isLoading } = useActivityDetail(activityId);
  if (isLoading || !data) return <Loader2 className="mx-auto my-8 size-6 animate-spin text-muted-foreground" aria-label="불러오는 중" />;
  return <RunnerBody detail={data} reload={() => void mutate()} />;
}

function RunnerBody({ detail, reload }: { detail: ActivityDetail; reload: () => void }) {
  const { activity, myResponse, results, myScore } = detail;
  const live = activity.status === "live";
  const { roomId } = useRoom();

  async function respond(data: unknown, success = "응답했어요!") {
    try {
      await api(`/api/rooms/${roomId}/activities/${activity.id}/respond`, { body: { data } });
      toast.success(success);
      reload();
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <div className="space-y-4">
      {activity.status === "ended" && <p className="rounded-xl bg-muted px-3 py-2 text-sm font-medium">활동이 끝났어요. 결과를 확인해 보세요.</p>}
      {activity.type === "poll" && <ChoiceInput activity={activity} initial={(myResponse?.selected as number[]) ?? []} disabled={!live} onSubmit={(selected) => respond({ selected })} submitLabel={myResponse ? "다시 투표" : "투표하기"} />}
      {activity.type === "quiz" && <QuizInput activity={activity} answered={Boolean(myResponse)} myScore={myScore} onSubmit={(selected) => respond({ selected }, "답을 제출했어요!")} mySelection={(myResponse?.selected as number[]) ?? []} />}
      {activity.type === "wordcloud" && live && <WordInput max={activity.config.maxWords ?? 3} initial={(myResponse?.words as string[]) ?? []} onSubmit={(words) => respond({ words }, "단어를 보냈어요!")} />}
      {activity.type === "ranking" && live && <RankingInput items={activity.config.items ?? []} initial={myResponse?.order as number[] | undefined} onSubmit={(order) => respond({ order })} />}
      {activity.type === "open" && live && <OpenInput initial={(myResponse?.text as string) ?? ""} onSubmit={(text) => respond({ text }, "응답을 보냈어요!")} />}
      {activity.type === "ideas" && live && <IdeaInput activityId={activity.id} onPosted={reload} />}
      {activity.type === "task" && <TaskInput activity={activity} done={myResponse?.done === true} disabled={!live} onToggle={(done) => respond({ done }, done ? "완료로 표시했어요!" : "완료를 취소했어요.")} />}

      {results ? (
        <div className="rounded-2xl border border-border bg-background p-4">
          <ResultsView
            results={results}
            config={activity.config}
            mySelection={(myResponse?.selected as number[]) ?? undefined}
            onLikeIdea={
              activity.type === "ideas" && activity.status !== "draft"
                ? async (ideaId) => {
                    try {
                      await api(`/api/rooms/${roomId}/activities/${activity.id}/ideas/${ideaId}/like`, { method: "POST" });
                      reload();
                    } catch (e) {
                      toastError(e);
                    }
                  }
                : undefined
            }
          />
          {activity.type === "ideas" && live && results.type === "ideas" && results.ideas.some((i) => i.mine) && (
            <MyIdeas activityId={activity.id} ideas={results.ideas.filter((i) => i.mine)} onDeleted={reload} />
          )}
        </div>
      ) : (
        myResponse && <p className="text-center text-sm text-muted-foreground">결과는 활동이 끝나면 공개돼요.</p>
      )}
    </div>
  );
}

function ChoiceInput({ activity, initial, disabled, onSubmit, submitLabel }: { activity: Activity; initial: number[]; disabled: boolean; onSubmit: (s: number[]) => Promise<void>; submitLabel: string }) {
  const [selected, setSelected] = useState<number[]>(initial);
  const [pending, setPending] = useState(false);
  const multiple = Boolean(activity.config.multiple);
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{multiple ? "여러 개 고를 수 있어요" : "하나를 골라 주세요"}</p>
      <div className="space-y-2" role={multiple ? "group" : "radiogroup"}>
        {(activity.config.options ?? []).map((opt, i) => {
          const on = selected.includes(i);
          return (
            <button
              key={i}
              role={multiple ? "checkbox" : "radio"}
              aria-checked={on}
              disabled={disabled}
              onClick={() => setSelected(multiple ? (on ? selected.filter((x) => x !== i) : [...selected, i]) : [i])}
              className={cn(
                "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border-2 px-4 text-left font-medium transition disabled:cursor-default",
                on ? "border-primary bg-primary-soft text-primary-hover" : "border-border bg-card hover:border-primary/40",
              )}
            >
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold", on ? "border-primary bg-primary text-white" : "border-border")}>
                {on ? "✓" : i + 1}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
      {!disabled && (
        <Button
          size="lg"
          className="w-full"
          disabled={pending || selected.length === 0}
          onClick={async () => {
            setPending(true);
            await onSubmit(selected);
            setPending(false);
          }}
        >
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {submitLabel}
        </Button>
      )}
    </div>
  );
}

function QuizInput({ activity, answered, myScore, mySelection, onSubmit }: { activity: Activity; answered: boolean; myScore: number | null; mySelection: number[]; onSubmit: (s: number[]) => Promise<void> }) {
  const limit = activity.config.timeLimitSec ?? 30;
  const remaining = useRemaining(activity.status === "live" ? activity.startedAt : null, limit);
  const timeUp = remaining === 0;
  return (
    <div className="space-y-3">
      {activity.status === "live" && remaining !== null && <Countdown remaining={remaining} total={limit} />}
      {activity.status === "ended" && myScore !== null && (
        <p className={cn("rounded-xl px-3 py-2 text-center font-bold", myScore > 0 ? "bg-green-50 text-green-800" : "bg-muted")}>{myScore > 0 ? `🎉 정답! ${myScore}점을 얻었어요` : "아쉬워요! 다음 문제에 도전해요"}</p>
      )}
      {answered && activity.status === "live" ? (
        <p className="flex items-center justify-center gap-2 rounded-xl bg-primary-soft px-3 py-3 font-semibold text-primary-hover">
          <CheckCircle2 className="size-5" aria-hidden /> 제출했어요! 결과는 퀴즈가 끝나면 나와요.
        </p>
      ) : activity.status === "live" && !timeUp ? (
        <ChoiceInput activity={{ ...activity, config: { ...activity.config, multiple: false } }} initial={mySelection} disabled={false} onSubmit={onSubmit} submitLabel="정답 제출" />
      ) : (
        activity.status === "live" && <p className="rounded-xl bg-muted px-3 py-3 text-center font-semibold">⏰ 시간이 끝났어요</p>
      )}
    </div>
  );
}

function WordInput({ max, initial, onSubmit }: { max: number; initial: string[]; onSubmit: (w: string[]) => Promise<void> }) {
  const [words, setWords] = useState<string[]>(() => Array.from({ length: max }, (_, i) => initial[i] ?? ""));
  const [pending, setPending] = useState(false);
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        await onSubmit(words.map((w) => w.trim()).filter(Boolean));
        setPending(false);
      }}
    >
      <p className="text-sm text-muted-foreground">짧은 단어로 {max}개까지 적어 주세요</p>
      {words.map((w, i) => (
        <Input key={i} value={w} maxLength={20} placeholder={`단어 ${i + 1}`} aria-label={`단어 ${i + 1}`} onChange={(e) => setWords(words.map((x, j) => (j === i ? e.target.value : x)))} />
      ))}
      <Button type="submit" size="lg" className="w-full" disabled={pending || words.every((w) => !w.trim())}>
        <Send aria-hidden /> {initial.length ? "다시 보내기" : "보내기"}
      </Button>
    </form>
  );
}

function RankingInput({ items, initial, onSubmit }: { items: string[]; initial?: number[]; onSubmit: (o: number[]) => Promise<void> }) {
  const [order, setOrder] = useState<number[]>(initial && initial.length === items.length ? initial : items.map((_, i) => i));
  const [pending, setPending] = useState(false);
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    setOrder(next);
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">화살표로 순서를 바꿔 주세요 (위가 1등)</p>
      <ol className="space-y-1.5">
        {order.map((itemIdx, rank) => (
          <li key={itemIdx} className="flex items-center gap-2 rounded-xl border border-border bg-card p-1.5 pl-3">
            <span className="w-6 font-bold text-primary">{rank + 1}</span>
            <span className="flex-1 font-medium">{items[itemIdx]}</span>
            <Button variant="ghost" size="icon-sm" aria-label={`${items[itemIdx]} 위로`} disabled={rank === 0} onClick={() => move(rank, -1)}>
              <ArrowUp aria-hidden />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`${items[itemIdx]} 아래로`} disabled={rank === order.length - 1} onClick={() => move(rank, 1)}>
              <ArrowDown aria-hidden />
            </Button>
          </li>
        ))}
      </ol>
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await onSubmit(order);
          setPending(false);
        }}
      >
        {initial ? "다시 제출" : "순위 제출"}
      </Button>
    </div>
  );
}

function OpenInput({ initial, onSubmit }: { initial: string; onSubmit: (t: string) => Promise<void> }) {
  const [text, setText] = useState(initial);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        await onSubmit(text);
        setPending(false);
      }}
    >
      <Textarea value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="생각을 자유롭게 적어 주세요" aria-label="자유 응답" />
      <Button type="submit" size="lg" className="w-full" disabled={pending || !text.trim()}>
        {initial ? "고쳐서 보내기" : "보내기"}
      </Button>
    </form>
  );
}

function IdeaInput({ activityId, onPosted }: { activityId: string; onPosted: () => void }) {
  const { roomId } = useRoom();
  const [body, setBody] = useState("");
  const [color, setColor] = useState<string>("yellow");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        try {
          await api(`/api/rooms/${roomId}/activities/${activityId}/ideas`, { body: { body, color } });
          setBody("");
          onPosted();
        } catch (err) {
          toastError(err);
        } finally {
          setPending(false);
        }
      }}
    >
      <Textarea value={body} maxLength={200} onChange={(e) => setBody(e.target.value)} placeholder="아이디어를 포스트잇에 적어요" aria-label="아이디어" className={cn("border-0 shadow-soft", ideaColorClass(color))} />
      <div className="flex items-center gap-2">
        <div className="flex gap-1" role="radiogroup" aria-label="포스트잇 색">
          {IDEA_COLOR_KEYS.map((c) => (
            <button
              type="button"
              key={c}
              role="radio"
              aria-checked={color === c}
              aria-label={{ yellow: "노랑", pink: "분홍", blue: "파랑", green: "초록", purple: "보라" }[c]}
              onClick={() => setColor(c)}
              className={cn("size-9 cursor-pointer rounded-full border-2", ideaColorClass(c), color === c ? "border-primary" : "border-transparent")}
            />
          ))}
        </div>
        <Button type="submit" className="ml-auto" disabled={pending || !body.trim()}>
          붙이기
        </Button>
      </div>
    </form>
  );
}

function MyIdeas({ activityId, ideas, onDeleted }: { activityId: string; ideas: { id: string; body: string }[]; onDeleted: () => void }) {
  const { roomId } = useRoom();
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-semibold">내 아이디어 관리 ({ideas.length})</summary>
      <ul className="mt-2 space-y-1">
        {ideas.map((i) => (
          <li key={i.id} className="flex items-center gap-2">
            <span className="flex-1 truncate">{i.body}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="아이디어 지우기"
              onClick={async () => {
                try {
                  await api(`/api/rooms/${roomId}/activities/${activityId}/ideas/${i.id}`, { method: "DELETE" });
                  onDeleted();
                } catch (e) {
                  toastError(e);
                }
              }}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function TaskInput({ activity, done, disabled, onToggle }: { activity: Activity; done: boolean; disabled: boolean; onToggle: (done: boolean) => Promise<void> }) {
  const duration = activity.config.durationSec ?? 0;
  const remaining = useRemaining(activity.status === "live" ? activity.startedAt : null, duration);
  return (
    <div className="space-y-3">
      {activity.config.description && <p className="rounded-xl bg-muted p-3 whitespace-pre-wrap">{activity.config.description}</p>}
      {remaining !== null && duration > 0 && <Countdown remaining={remaining} total={duration} />}
      {remaining === 0 && <p className="text-center font-semibold text-coral">⏰ 시간이 다 됐어요!</p>}
      <Button size="lg" variant={done ? "soft" : "default"} className="w-full" disabled={disabled} onClick={() => onToggle(!done)} aria-pressed={done}>
        <CheckCircle2 aria-hidden /> {done ? "완료했어요 (취소하려면 누르기)" : "다 했어요!"}
      </Button>
    </div>
  );
}
