"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2, Merge, Play, Shuffle, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { BoardPanel } from "@/components/room/board/board-panel";
import { ChatPanel } from "@/components/room/chat-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Group } from "@/lib/types";
import { cn } from "@/lib/utils";

type ParticipantLite = { id: string; nickname: string; groupId: string | null; kicked: boolean };
const MODES = [
  { value: "random", label: "자동 랜덤", desc: "버튼 한 번으로 고르게 나눠요" },
  { value: "manual", label: "수동 지정", desc: "강사가 한 명씩 정해요" },
  { value: "choice", label: "수강생 선택", desc: "수강생이 직접 조를 골라요" },
] as const;

export function GroupsManager() {
  const { roomId, room, online } = useRoom();
  const { data, mutate } = useSWR<{ groups: Group[] }>(`/api/rooms/${roomId}/groups`, fetcher);
  const { data: pData, mutate: mutateP } = useSWR<{ participants: ParticipantLite[] }>(`/api/rooms/${roomId}/participants`, fetcher);
  const [count, setCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<string | null>(null);
  useRoomEvent("group.changed", () => {
    void mutate();
    void mutateP();
  });
  useRoomEvent("participant.joined", () => void mutateP());

  const groups = data?.groups ?? [];
  const people = (pData?.participants ?? []).filter((p) => !p.kicked);
  const active = room.settings.groups.active;
  const mode = room.settings.groups.mode;
  const unassigned = people.filter((p) => !p.groupId);
  const viewing = groups.find((g) => g.id === view) ?? null;

  async function action(body: Record<string, unknown>, success?: string) {
    setBusy(true);
    try {
      await api(`/api/rooms/${roomId}/groups/actions`, { body });
      await Promise.all([mutate(), mutateP()]);
      if (success) toast.success(success);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">조 활동</h2>
            {active ? <Badge>진행 중</Badge> : <Badge variant="secondary">대기</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">조 활동을 시작하면 수강생은 우리 조 채팅과 산출물 섹션을 따로 쓰게 돼요. 실시간 연결은 그대로 하나예요.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!active ? (
              <Button disabled={busy || groups.length < 2} onClick={() => action({ action: "start" }, "조 활동을 시작했어요.")}>
                <Play aria-hidden /> 조 활동 시작
              </Button>
            ) : (
              <ConfirmButton
                title="조 활동을 마치고 메인으로 합칠까요?"
                description="조별 채팅은 기록으로 남고, 조별 산출물은 메인 보드에 조 이름 섹션으로 모여요."
                confirmLabel="메인으로 합치기"
                onConfirm={() => action({ action: "end" }, "메인으로 합쳤어요. 조별 산출물은 섹션으로 남았어요.")}
              >
                <Button variant="coral" disabled={busy}>
                  <Merge aria-hidden /> 메인으로 합치기
                </Button>
              </ConfirmButton>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-lg font-bold">조 편성</h2>
          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api(`/api/rooms/${roomId}/groups`, { body: { count } });
                await Promise.all([mutate(), mutateP()]);
                toast.success(`${count}개 조를 만들었어요.`);
              } catch (err) {
                toastError(err);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="g-count">조 개수</Label>
              <Input id="g-count" type="number" min={2} max={20} value={count} onChange={(e) => setCount(Math.min(20, Math.max(2, Number(e.target.value) || 2)))} className="w-28" />
            </div>
            <Button type="submit" variant="outline" disabled={busy || active}>
              {groups.length ? "다시 만들기" : "조 만들기"}
            </Button>
          </form>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-semibold">편성 방식</legend>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  role="radio"
                  aria-checked={mode === m.value}
                  disabled={busy}
                  onClick={() => action({ action: "set-mode", mode: m.value })}
                  className={cn("min-h-11 cursor-pointer rounded-xl border p-3 text-left", mode === m.value ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40")}
                >
                  <span className="block font-bold">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.desc}</span>
                </button>
              ))}
            </div>
          </fieldset>
          {mode === "random" && (
            <Button className="mt-3" disabled={busy || groups.length < 2 || people.length === 0} onClick={() => action({ action: "assign-random" }, "랜덤으로 나눴어요.")}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Shuffle aria-hidden />} 랜덤으로 나누기
            </Button>
          )}
          {mode === "choice" && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">수강생 화면에 조 고르기 버튼이 떠요. 조 활동을 시작하기 전에 골라 달라고 안내해 주세요.</p>}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-lg font-bold">
            참여자 {people.length}명 {unassigned.length > 0 && <span className="text-sm font-normal text-coral">· 미배정 {unassigned.length}명</span>}
          </h2>
          {groups.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">먼저 조를 만들어 주세요.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {people.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-2">
                  <span className={cn("size-2 rounded-full", online.has(p.id) ? "bg-signal-green" : "bg-muted-foreground/30")} aria-label={online.has(p.id) ? "접속 중" : "접속 안 함"} />
                  <span className="flex-1 font-medium">{p.nickname}</span>
                  <Select value={p.groupId ?? "none"} onValueChange={(v) => action({ action: "set-member", participantId: p.id, groupId: v === "none" ? null : v })}>
                    <SelectTrigger className="h-10 w-32" aria-label={`${p.nickname}의 조`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">미배정</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-border p-2" role="tablist" aria-label="조 살펴보기">
          {groups.length === 0 && <p className="p-2 text-sm text-muted-foreground">조를 만들면 여기서 조별 채팅과 산출물을 오가며 볼 수 있어요.</p>}
          {groups.map((g) => (
            <Button key={g.id} role="tab" aria-selected={view === g.id} size="sm" variant={view === g.id ? "soft" : "ghost"} onClick={() => setView(g.id)}>
              <UsersRound aria-hidden /> {g.name} <span className="text-muted-foreground">({g.memberCount})</span>
            </Button>
          ))}
        </div>
        {viewing ? (
          <div className="grid min-h-0 flex-1 grid-rows-2">
            <div className="flex min-h-0 flex-col border-b border-border">
              <p className="px-3 pt-2 text-sm font-bold">{viewing.name} 채팅</p>
              <ChatPanel key={`c-${viewing.id}`} groupId={viewing.id} />
            </div>
            <div className="flex min-h-0 flex-col">
              <p className="px-3 pt-2 text-sm font-bold">{viewing.name} 산출물</p>
              <BoardPanel key={`b-${viewing.id}`} groupId={viewing.id} />
            </div>
          </div>
        ) : (
          groups.length > 0 && <p className="m-auto p-6 text-center text-muted-foreground">위에서 조를 골라 채팅과 산출물을 확인해요.</p>
        )}
      </section>
    </div>
  );
}
