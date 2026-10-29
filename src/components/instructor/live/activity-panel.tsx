"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDown, Loader2, Play, Plus, RotateCcw, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { ResultsView } from "@/components/room/activities/results-view";
import { Countdown, useRemaining } from "@/components/room/activities/timer";
import { useActivityDetail } from "@/components/room/activities/use-activity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVITY_LABELS, ACTIVITY_TYPES } from "@/lib/activities/schema";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Activity, ActivityType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ActivityPanel() {
  const { roomId, room } = useRoom();
  const key = `/api/rooms/${roomId}/activities`;
  const { data, mutate } = useSWR<{ activities: Activity[] }>(key, fetcher);
  const [expanded, setExpanded] = useState<string | null>(null);
  const activities = data?.activities ?? [];
  const live = activities.find((a) => a.status === "live") ?? null;
  useRoomEvent("activity.changed", () => void mutate());

  async function setStatus(a: Activity, status: Activity["status"]) {
    try {
      await api(`/api/rooms/${roomId}/activities/${a.id}`, { method: "PATCH", body: { status } });
      await mutate();
      if (status === "live") toast.success(`'${a.title}' 활동을 시작했어요. 수강생 화면에 팝업이 떠요.`);
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <section aria-labelledby="act-title" className="rounded-2xl border border-border bg-card p-3 shadow-soft sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="act-title" className="text-lg font-bold">
          활동
        </h2>
        <ActivityBuilder onCreated={() => void mutate()} />
      </div>

      {live && <LiveActivityCard activity={live} onEnd={() => setStatus(live, "ended")} />}

      {activities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          투표·퀴즈·워드클라우드 같은 활동을 미리 만들어 두고, 수업 중에 버튼 하나로 시작해요.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {activities.map((a) => (
            <li key={a.id} className={cn("rounded-xl border", a.status === "live" ? "border-primary" : "border-border")}>
              <div className="flex flex-wrap items-center gap-2 p-2.5">
                <span className="text-xl" aria-hidden>
                  {ACTIVITY_LABELS[a.type].emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{ACTIVITY_LABELS[a.type].name}</p>
                </div>
                <Badge variant={a.status === "live" ? "default" : a.status === "ended" ? "secondary" : "outline"}>{a.status === "live" ? "진행 중" : a.status === "ended" ? "종료" : "준비"}</Badge>
                {a.status !== "live" && room.status === "active" && (
                  <Button size="sm" onClick={() => setStatus(a, "live")}>
                    <Play aria-hidden /> {a.status === "ended" ? "다시 시작" : "시작"}
                  </Button>
                )}
                {a.status === "live" && (
                  <Button size="sm" variant="coral" onClick={() => setStatus(a, "ended")}>
                    <Square aria-hidden /> 종료
                  </Button>
                )}
                {a.status !== "draft" && (
                  <Button size="sm" variant="ghost" aria-expanded={expanded === a.id} onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                    결과 <ChevronDown className={cn("transition", expanded === a.id && "rotate-180")} aria-hidden />
                  </Button>
                )}
                {a.status === "ended" && (
                  <ConfirmButton title="응답을 지우고 준비 상태로 돌릴까요?" description="이 활동의 응답과 결과가 모두 지워져요." confirmLabel="초기화" destructive onConfirm={() => setStatus(a, "draft")}>
                    <Button size="icon-sm" variant="ghost" aria-label="활동 초기화">
                      <RotateCcw aria-hidden />
                    </Button>
                  </ConfirmButton>
                )}
                <ConfirmButton
                  title="활동을 삭제할까요?"
                  description={`'${a.title}'과 응답이 모두 삭제돼요.`}
                  confirmLabel="삭제"
                  destructive
                  onConfirm={async () => {
                    try {
                      await api(`/api/rooms/${roomId}/activities/${a.id}`, { method: "DELETE" });
                      await mutate();
                    } catch (e) {
                      toastError(e);
                    }
                  }}
                >
                  <Button size="icon-sm" variant="ghost" aria-label="활동 삭제">
                    <Trash2 aria-hidden />
                  </Button>
                </ConfirmButton>
              </div>
              {expanded === a.id && a.status !== "live" && (
                <div className="border-t border-border p-3">
                  <ActivityResultsBlock activityId={a.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LiveActivityCard({ activity, onEnd }: { activity: Activity; onEnd: () => void }) {
  const limit = activity.type === "quiz" ? (activity.config.timeLimitSec ?? 30) : activity.type === "task" ? (activity.config.durationSec ?? 0) : 0;
  const remaining = useRemaining(activity.startedAt, limit || undefined);
  return (
    <div className="rounded-2xl border-2 border-primary bg-primary-soft/30 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-primary">
            {ACTIVITY_LABELS[activity.type].emoji} 진행 중 · {ACTIVITY_LABELS[activity.type].name}
          </p>
          <h3 className="text-lg font-bold">{activity.title}</h3>
        </div>
        <Button variant="coral" onClick={onEnd}>
          <Square aria-hidden /> 종료
        </Button>
      </div>
      {remaining !== null && limit > 0 && <Countdown remaining={remaining} total={limit} className="mb-3" />}
      <ActivityResultsBlock activityId={activity.id} />
    </div>
  );
}

function ActivityResultsBlock({ activityId }: { activityId: string }) {
  const { data } = useActivityDetail(activityId);
  if (!data) return <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" aria-label="결과 불러오는 중" />;
  if (!data.results) return <p className="text-sm text-muted-foreground">아직 결과가 없어요.</p>;
  return <ResultsView results={data.results} config={data.activity.config} />;
}

/** 활동 만들기 */
function ActivityBuilder({ onCreated }: { onCreated: () => void }) {
  const { roomId } = useRoom();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>("poll");
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [reveal, setReveal] = useState<"live" | "after">("live");
  const [correct, setCorrect] = useState<number[]>([0]);
  const [timeLimit, setTimeLimit] = useState(30);
  const [points, setPoints] = useState(100);
  const [leaderboard, setLeaderboard] = useState(true);
  const [maxWords, setMaxWords] = useState(3);
  const [description, setDescription] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [pending, setPending] = useState(false);

  const usesOptions = type === "poll" || type === "quiz" || type === "ranking";

  function reset() {
    setTitle("");
    setOptions(["", ""]);
    setCorrect([0]);
    setDescription("");
  }

  function config() {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    switch (type) {
      case "poll":
        return { options: opts, multiple, reveal };
      case "quiz":
        return { options: opts, correct: correct.filter((i) => i < opts.length), timeLimitSec: timeLimit, points, leaderboard };
      case "ranking":
        return { items: opts };
      case "wordcloud":
        return { maxWords };
      case "task":
        return { description, durationSec: Math.round(minutes * 60) };
      default:
        return {};
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden /> 활동 만들기
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>활동 만들기</DialogTitle>
          <DialogDescription>만들어 두면 수업 중 [시작] 버튼 하나로 수강생 화면에 띄울 수 있어요.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              await api(`/api/rooms/${roomId}/activities`, { body: { type, title, config: config() } });
              toast.success("활동을 만들었어요.");
              reset();
              setOpen(false);
              onCreated();
            } catch (err) {
              toastError(err);
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="활동 종류">
            {ACTIVITY_TYPES.map((t) => (
              <button
                type="button"
                role="radio"
                aria-checked={type === t}
                key={t}
                onClick={() => setType(t)}
                className={cn("min-h-11 cursor-pointer rounded-xl border p-2.5 text-left transition", type === t ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40")}
              >
                <span className="block font-bold">
                  {ACTIVITY_LABELS[t].emoji} {ACTIVITY_LABELS[t].name}
                </span>
                <span className="text-xs text-muted-foreground">{ACTIVITY_LABELS[t].description}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="act-title-input">{type === "task" ? "과제 이름" : "질문"}</Label>
            <Input id="act-title-input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder={type === "task" ? "예: 실습 1 — 프롬프트 만들기" : "예: 오늘 수업에서 가장 기대되는 것은?"} required />
          </div>

          {usesOptions && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-semibold">
                {type === "ranking" ? "항목" : "선택지"}
                {type === "quiz" && <span className="ml-1 font-normal text-muted-foreground">(정답에 체크)</span>}
              </legend>
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  {type === "quiz" && (
                    <input
                      type="checkbox"
                      aria-label={`${i + 1}번 정답`}
                      checked={correct.includes(i)}
                      onChange={(e) => setCorrect(e.target.checked ? [...correct, i] : correct.filter((c) => c !== i))}
                      className="size-5 accent-[var(--primary)]"
                    />
                  )}
                  <Input value={o} maxLength={100} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`${i + 1}번`} aria-label={`${i + 1}번 ${type === "ranking" ? "항목" : "선택지"}`} />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${i + 1}번 지우기`}
                      onClick={() => {
                        setOptions(options.filter((_, j) => j !== i));
                        setCorrect(correct.filter((c) => c !== i).map((c) => (c > i ? c - 1 : c)));
                      }}
                    >
                      <X aria-hidden />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < (type === "quiz" ? 6 : 10) && (
                <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, ""])}>
                  <Plus aria-hidden /> 추가
                </Button>
              )}
            </fieldset>
          )}

          {type === "poll" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Switch id="act-multi" checked={multiple} onCheckedChange={setMultiple} />
                <Label htmlFor="act-multi">복수 선택</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="act-reveal" checked={reveal === "after"} onCheckedChange={(v) => setReveal(v ? "after" : "live")} />
                <Label htmlFor="act-reveal">결과는 종료 후 공개</Label>
              </div>
            </div>
          )}
          {type === "quiz" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="act-time">제한시간(초)</Label>
                <Input id="act-time" type="number" min={5} max={600} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value) || 30)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="act-points">배점</Label>
                <Input id="act-points" type="number" min={0} max={1000} value={points} onChange={(e) => setPoints(Number(e.target.value) || 0)} />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch id="act-lb" checked={leaderboard} onCheckedChange={setLeaderboard} />
                <Label htmlFor="act-lb">점수판 보이기</Label>
              </div>
            </div>
          )}
          {type === "wordcloud" && (
            <div className="space-y-1.5">
              <Label htmlFor="act-words">한 사람당 단어 수 (1~3)</Label>
              <Input id="act-words" type="number" min={1} max={3} value={maxWords} onChange={(e) => setMaxWords(Math.min(3, Math.max(1, Number(e.target.value) || 1)))} />
            </div>
          )}
          {type === "task" && (
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <div className="space-y-1.5">
                <Label htmlFor="act-desc">안내</Label>
                <Textarea id="act-desc" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} placeholder="무엇을 하면 되는지 적어 주세요" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="act-min">타이머(분, 0=없음)</Label>
                <Input id="act-min" type="number" min={0} max={240} value={minutes} onChange={(e) => setMinutes(Math.max(0, Number(e.target.value) || 0))} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}만들기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
