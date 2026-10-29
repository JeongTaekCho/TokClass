"use client";

import { useState } from "react";
import useSWR from "swr";
import { Copy, Hand, KeyRound, MessageSquare, Search, UserX, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { DmInbox } from "@/components/instructor/live/dm-inbox";
import { SIGNALS } from "@/components/room/signal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { api, fetcher } from "@/lib/client/api";
import { copyText } from "@/lib/client/clipboard";
import { toastError } from "@/lib/client/toast-error";
import { timeAgo } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Group } from "@/lib/types";
import { cn } from "@/lib/utils";

type P = { id: string; nickname: string; kicked: boolean; groupId: string | null; lastActiveAt: string; createdAt: string; understanding: "green" | "yellow" | "red" | null; needsHelp: boolean };

export function ParticipantsManager() {
  const { roomId, online } = useRoom();
  const { data, mutate } = useSWR<{ participants: P[] }>(`/api/rooms/${roomId}/participants`, fetcher, { refreshInterval: 30_000 });
  const { data: gData } = useSWR<{ groups: Group[] }>(`/api/rooms/${roomId}/groups`, fetcher);
  const [query, setQuery] = useState("");
  const [issued, setIssued] = useState<{ nickname: string; password: string } | null>(null);
  const [dmWith, setDmWith] = useState<string | null>(null);
  useRoomEvent("participant.joined", () => void mutate());
  useRoomEvent("understanding.counts", () => void mutate());
  useRoomEvent("help.changed", () => void mutate());
  useRoomEvent("group.changed", () => void mutate());

  const groups = new Map((gData?.groups ?? []).map((g) => [g.id, g.name]));
  const list = (data?.participants ?? []).filter((p) => p.nickname.toLowerCase().includes(query.trim().toLowerCase()));
  const active = list.filter((p) => !p.kicked).sort((a, b) => Number(online.has(b.id)) - Number(online.has(a.id)) || a.nickname.localeCompare(b.nickname));
  const kicked = list.filter((p) => p.kicked);
  const onlineCount = (data?.participants ?? []).filter((p) => !p.kicked && online.has(p.id)).length;

  async function act(p: P, action: "reissue" | "kick" | "restore") {
    try {
      const res = await api<{ password?: string }>(`/api/rooms/${roomId}/participants/${p.id}`, { body: { action } });
      if (res.password) setIssued({ nickname: p.nickname, password: res.password });
      if (action === "kick") toast.success(`${p.nickname}님을 내보냈어요.`);
      if (action === "restore") toast.success(`${p.nickname}님이 다시 들어올 수 있어요.`);
      await mutate();
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-muted-foreground">
          전체 <strong className="text-foreground">{(data?.participants ?? []).filter((p) => !p.kicked).length}명</strong> · 지금 접속 <strong className="text-foreground">{onlineCount}명</strong>
        </p>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="닉네임 검색" aria-label="닉네임 검색" className="pl-9" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">닉네임</th>
              <th className="px-4 py-3">접속</th>
              <th className="px-4 py-3">이해도</th>
              <th className="px-4 py-3">조</th>
              <th className="px-4 py-3">마지막 활동</th>
              <th className="px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {active.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  아직 참여자가 없어요.
                </td>
              </tr>
            )}
            {active.map((p) => {
              const sig = SIGNALS.find((s) => s.status === p.understanding);
              const isOn = online.has(p.id);
              return (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5 font-semibold">
                    {p.nickname}
                    {p.needsHelp && (
                      <Badge variant="coral-soft" className="ml-1.5">
                        <Hand aria-hidden /> 도움 요청
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", isOn ? "bg-signal-green" : "bg-muted-foreground/30")} aria-hidden />
                      {isOn ? "접속 중" : "오프라인"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{sig ? `${sig.emoji} ${sig.short}` : <span className="text-muted-foreground">-</span>}</td>
                  <td className="px-4 py-2.5">{p.groupId ? (groups.get(p.groupId) ?? "-") : "-"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{timeAgo(p.lastActiveAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDmWith(p.id)}>
                        <MessageSquare aria-hidden /> 1:1
                      </Button>
                      <ConfirmButton
                        title={`${p.nickname}님의 비밀번호를 새로 발급할까요?`}
                        description="기존 비밀번호와 지금 접속 중인 기기의 연결이 바로 끊겨요. 새 비밀번호는 한 번만 보여요."
                        confirmLabel="재발급"
                        onConfirm={() => act(p, "reissue")}
                      >
                        <Button size="sm" variant="ghost">
                          <KeyRound aria-hidden /> 비밀번호 재발급
                        </Button>
                      </ConfirmButton>
                      <ConfirmButton
                        title={`${p.nickname}님을 내보낼까요?`}
                        description="바로 연결이 끊기고 비밀번호로도 다시 들어올 수 없어요. 남긴 기록은 유지돼요."
                        confirmLabel="내보내기"
                        destructive
                        onConfirm={() => act(p, "kick")}
                      >
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <UserX aria-hidden /> 강퇴
                        </Button>
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {kicked.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">내보낸 참여자</h2>
          <ul className="flex flex-wrap gap-2">
            {kicked.map((p) => (
              <li key={p.id} className="flex items-center gap-1 rounded-full border border-border bg-card py-1 pr-1 pl-3 text-sm">
                {p.nickname}
                <Button size="sm" variant="ghost" onClick={() => act(p, "restore")}>
                  <Undo2 aria-hidden /> 복구
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={Boolean(issued)} onOpenChange={(o) => !o && setIssued(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{issued?.nickname}님의 새 비밀번호</DialogTitle>
            <DialogDescription>이 창을 닫으면 다시 볼 수 없어요. 수강생에게 바로 알려 주세요.</DialogDescription>
          </DialogHeader>
          {issued && (
            <div className="rounded-2xl bg-primary-soft p-5 text-center">
              <p className="font-mono text-4xl font-extrabold tracking-[0.3em] text-primary-hover">{issued.password}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => copyText(issued.password, "비밀번호를 복사했어요.")}>
                <Copy aria-hidden /> 복사
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(dmWith)} onOpenChange={(o) => !o && setDmWith(null)}>
        <SheetContent className="gap-0 p-0">
          <SheetHeader className="border-b border-border">
            <SheetTitle>1:1 메시지</SheetTitle>
            <SheetDescription>이 수강생에게만 보여요.</SheetDescription>
          </SheetHeader>
          {dmWith && <DmInbox openWith={dmWith} onOpenChange={(id) => setDmWith(id)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
