"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Copy, Download, KeyRound, LogOut, MoreHorizontal, Pencil, Search, Undo2, UserRound, UserX } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, fetcher, setActingAs } from "@/lib/client/api";
import { copyText } from "@/lib/client/clipboard";
import { toastError } from "@/lib/client/toast-error";
import { formatDate, formatDateTimeFull, timeAgo } from "@/lib/format";
import { filterParticipants, participantState, sortParticipants, type StateFilter } from "@/lib/manage/filter";
import { useRoomsPresence } from "@/lib/realtime/presence-watch";
import { toCsv } from "@/lib/report/csv";
import { cn } from "@/lib/utils";

import { ParticipantDetail } from "./participant-detail";
import { RoomQuick } from "./room-quick";
import { STATE_LABEL, type ManageParticipant, type ManageRoom } from "./types";

// 같은 브라우저에 수강생 쿠키가 있어도 강사 세션을 우선해요.
if (typeof window !== "undefined") setActingAs("instructor");

const ALL = "all";
const NO_GROUP = "none";

type SingleAction = "reissue" | "kick" | "restore" | "logout";

/** 강사용 수강생 관리: 내 방들의 수강생을 한 화면에서 (본인 방만, 서버에서 owner 확인) */
export function ManageApp() {
  const rooms = useSWR<{ rooms: ManageRoom[] }>("/api/manage/rooms", fetcher);
  const [roomId, setRoomId] = useState<string | null>(null);
  const people = useSWR<{ participants: ManageParticipant[]; truncated: boolean }>(`/api/manage/participants${roomId ? `?roomId=${roomId}` : ""}`, fetcher, {
    refreshInterval: 30_000,
  });
  const [query, setQuery] = useState("");
  const [state, setState] = useState<StateFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<ManageParticipant | null>(null);
  const [renaming, setRenaming] = useState<ManageParticipant | null>(null);
  const [newName, setNewName] = useState("");
  const [issued, setIssued] = useState<{ nickname: string; password: string } | null>(null);

  const roomList = useMemo(() => rooms.data?.rooms ?? [], [rooms.data]);
  const roomMap = useMemo(() => new Map(roomList.map((r) => [r.id, r])), [roomList]);
  const activeIds = useMemo(() => roomList.filter((r) => r.status === "active" && (!roomId || r.id === roomId)).map((r) => r.id), [roomList, roomId]);

  const refresh = () => {
    void people.mutate();
    void rooms.mutate();
  };
  // 진행 중인 방의 접속 현황 + 입장·강퇴·조 변경을 실시간으로 반영해요.
  const online = useRoomsPresence(activeIds, (event) => {
    if (event === "participant.joined" || event === "participant.session" || event === "group.changed" || event === "room.updated") refresh();
  });

  const all = useMemo(() => people.data?.participants ?? [], [people.data]);
  const list = useMemo(() => sortParticipants(filterParticipants(all, { roomId, query, state, online }), online), [all, roomId, query, state, online]);
  const visibleSelected = list.filter((p) => selected.has(p.id));
  const allChecked = list.length > 0 && visibleSelected.length === list.length;
  const selectedRoom = roomId ? roomMap.get(roomId) : undefined;

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function act(p: ManageParticipant, body: { action: SingleAction } | { action: "move"; groupId: string | null } | { action: "rename"; nickname: string }) {
    try {
      const res = await api<{ password?: string }>(`/api/rooms/${p.roomId}/participants/${p.id}`, { body });
      if (res.password) setIssued({ nickname: p.nickname, password: res.password });
      if (body.action === "kick") toast.success(`${p.nickname}님을 내보냈어요.`);
      if (body.action === "restore") toast.success(`${p.nickname}님이 다시 들어올 수 있어요.`);
      if (body.action === "logout") toast.success(`${p.nickname}님의 접속을 끊었어요. 비밀번호로 다시 들어올 수 있어요.`);
      if (body.action === "rename") toast.success(`닉네임을 ${body.nickname}(으)로 바꿨어요.`);
      refresh();
      return true;
    } catch (e) {
      toastError(e);
      return false;
    }
  }

  async function bulk(action: "kick" | "logout") {
    const ids = visibleSelected.map((p) => p.id);
    try {
      const res = await api<{ done: number }>("/api/manage/participants/bulk", { body: { action, participantIds: ids } });
      toast.success(action === "kick" ? `${res.done}명을 내보냈어요.` : `${res.done}명의 접속을 끊었어요.`);
      setSelected(new Set());
      refresh();
    } catch (e) {
      toastError(e);
    }
  }

  /** 고른 수강생만 CSV로 (화면에 있는 데이터로 만들어요. 비밀번호는 서버에도 원문이 없어요) */
  function exportSelected() {
    const rows = visibleSelected.map((p) => {
      const r = roomMap.get(p.roomId);
      return [r?.title ?? "", r?.joinCode ?? "", p.nickname, STATE_LABEL[participantState(p, online)], r?.groups.find((g) => g.id === p.groupId)?.name ?? "", formatDateTimeFull(p.createdAt), formatDateTimeFull(p.lastActiveAt)];
    });
    const blob = new Blob([toCsv(["방", "참여코드", "닉네임", "상태", "조", "참여일", "마지막 활동"], rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "수강생_선택.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={roomId ?? ALL} onValueChange={(v) => { setRoomId(v === ALL ? null : v); setSelected(new Set()); }}>
          <SelectTrigger className="h-10 w-full sm:w-64" aria-label="방 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>모든 방</SelectItem>
            {roomList.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.status === "active" ? "● " : ""}
                {r.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={state} onValueChange={(v) => setState(v as StateFilter)}>
          <SelectTrigger className="h-10 w-36" aria-label="상태 필터">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="online">접속 중</SelectItem>
            <SelectItem value="offline">오프라인</SelectItem>
            <SelectItem value="kicked">강퇴됨</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative w-full sm:ml-auto sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="닉네임 검색" aria-label="닉네임 검색" className="pl-9" />
        </div>
      </div>

      {selectedRoom && <RoomQuick room={selectedRoom} onChanged={() => void rooms.mutate()} />}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <p className="text-muted-foreground">
          {list.length}명 표시 · 지금 접속 <strong className="text-foreground">{all.filter((p) => !p.kicked && online.has(p.id)).length}명</strong>
        </p>
        <div className="ml-auto flex flex-wrap gap-1">
          {visibleSelected.length > 0 && (
            <>
              <span className="self-center px-1 font-semibold">{visibleSelected.length}명 선택</span>
              <ConfirmButton
                title={`${visibleSelected.length}명의 접속을 끊을까요?`}
                description="비밀번호는 그대로라 다시 들어올 수 있어요."
                confirmLabel="강제 로그아웃"
                onConfirm={() => bulk("logout")}
              >
                <Button size="sm" variant="outline">
                  <LogOut aria-hidden /> 강제 로그아웃
                </Button>
              </ConfirmButton>
              <ConfirmButton
                title={`${visibleSelected.length}명을 내보낼까요?`}
                description="바로 연결이 끊기고 비밀번호로도 다시 들어올 수 없어요. 남긴 기록은 유지돼요."
                confirmLabel="내보내기"
                destructive
                onConfirm={() => bulk("kick")}
              >
                <Button size="sm" variant="outline" className="text-destructive">
                  <UserX aria-hidden /> 강퇴
                </Button>
              </ConfirmButton>
              <Button size="sm" variant="outline" onClick={exportSelected}>
                <Download aria-hidden /> 선택 CSV
              </Button>
            </>
          )}
          <Button asChild size="sm" variant="ghost">
            <a href={`/api/manage/export${roomId ? `?roomId=${roomId}` : ""}`} download>
              <Download aria-hidden /> {roomId ? "이 방" : "전체"} CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(v) => setSelected(v === true ? new Set(list.map((p) => p.id)) : new Set())}
                  aria-label="모두 선택"
                />
              </th>
              <th className="px-2 py-3">닉네임</th>
              {!roomId && <th className="px-4 py-3">방</th>}
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">조</th>
              <th className="px-4 py-3">마지막 접속</th>
              <th className="px-4 py-3">참여일</th>
              <th className="px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  {people.isLoading || rooms.isLoading ? "불러오는 중이에요." : all.length === 0 ? "아직 수강생이 없어요." : "조건에 맞는 수강생이 없어요."}
                </td>
              </tr>
            )}
            {list.map((p) => {
              const room = roomMap.get(p.roomId);
              const st = participantState(p, online);
              return (
                <tr key={p.id} className={cn("border-b border-border/60 last:border-0", selected.has(p.id) && "bg-primary-soft/40")}>
                  <td className="px-4 py-2">
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={(v) => toggle(p.id, v === true)} aria-label={`${p.nickname} 선택`} />
                  </td>
                  <td className="px-2 py-2 font-semibold">
                    <button type="button" className="hover:text-primary hover:underline" onClick={() => setDetail(p)}>
                      {p.nickname}
                    </button>
                  </td>
                  {!roomId && <td className="max-w-[14rem] truncate px-4 py-2 text-muted-foreground">{room?.title}</td>}
                  <td className="px-4 py-2">
                    {st === "kicked" ? (
                      <Badge variant="coral-soft">강퇴됨</Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("size-2 rounded-full", st === "online" ? "bg-signal-green" : "bg-muted-foreground/30")} aria-hidden />
                        {STATE_LABEL[st]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {room && room.groups.length > 0 && !p.kicked ? (
                      <Select value={p.groupId ?? NO_GROUP} onValueChange={(v) => void act(p, { action: "move", groupId: v === NO_GROUP ? null : v })}>
                        <SelectTrigger className="h-8 w-28" aria-label={`${p.nickname} 조 이동`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_GROUP}>조 없음</SelectItem>
                          {room.groups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground">{room?.groups.find((g) => g.id === p.groupId)?.name ?? "-"}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{st === "online" ? "지금" : timeAgo(p.lastActiveAt)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <ParticipantMenu
                      p={p}
                      onDetail={() => setDetail(p)}
                      onRename={() => {
                        setNewName(p.nickname);
                        setRenaming(p);
                      }}
                      onAct={(action) => act(p, { action })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {people.data?.truncated && <p className="text-sm text-muted-foreground">수강생이 많아서 최근 참여한 3,000명까지만 보여요. 방을 골라 좁혀 주세요.</p>}

      <ParticipantDetail participant={detail} room={detail ? roomMap.get(detail.roomId) : undefined} state={detail ? participantState(detail, online) : "offline"} onOpenChange={(o) => !o && setDetail(null)} />

      <Dialog open={Boolean(renaming)} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>닉네임 바꾸기</DialogTitle>
            <DialogDescription>같은 방에서 이미 쓰는 닉네임은 쓸 수 없어요. 수강생 화면에는 다시 들어오면 반영돼요.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (renaming && (await act(renaming, { action: "rename", nickname: newName.trim() }))) setRenaming(null);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="rename">새 닉네임</Label>
              <Input id="rename" value={newName} onChange={(e) => setNewName(e.target.value)} minLength={2} maxLength={12} required autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>
                취소
              </Button>
              <Button type="submit" disabled={newName.trim().length < 2}>
                바꾸기
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}

/** 한 명에 대한 작업 메뉴. 되돌리기 어려운 작업은 확인을 거쳐요. */
function ParticipantMenu({ p, onDetail, onRename, onAct }: { p: ManageParticipant; onDetail: () => void; onRename: () => void; onAct: (a: SingleAction) => Promise<boolean> }) {
  const [confirm, setConfirm] = useState<SingleAction | null>(null);
  const copy: Record<Exclude<SingleAction, "restore">, { title: string; description: string; label: string; destructive?: boolean }> = {
    reissue: { title: `${p.nickname}님의 비밀번호를 새로 발급할까요?`, description: "기존 비밀번호와 지금 접속 중인 기기의 연결이 바로 끊겨요. 새 비밀번호는 한 번만 보여요.", label: "재발급" },
    logout: { title: `${p.nickname}님의 접속을 끊을까요?`, description: "비밀번호는 그대로라 다시 들어올 수 있어요.", label: "강제 로그아웃" },
    kick: { title: `${p.nickname}님을 내보낼까요?`, description: "바로 연결이 끊기고 비밀번호로도 다시 들어올 수 없어요. 남긴 기록은 유지돼요.", label: "내보내기", destructive: true },
  };
  const c = confirm && confirm !== "restore" ? copy[confirm] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label={`${p.nickname} 관리`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onDetail}>
            <UserRound aria-hidden /> 상세 보기
          </DropdownMenuItem>
          {p.kicked ? (
            <DropdownMenuItem onSelect={() => void onAct("restore")}>
              <Undo2 aria-hidden /> 복구
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onSelect={onRename}>
                <Pencil aria-hidden /> 닉네임 변경
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setConfirm("reissue")}>
                <KeyRound aria-hidden /> 비밀번호 재발급
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setConfirm("logout")}>
                <LogOut aria-hidden /> 강제 로그아웃
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onSelect={() => setConfirm("kick")}>
                <UserX aria-hidden /> 강퇴
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={Boolean(c)} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{c?.title}</DialogTitle>
            <DialogDescription>{c?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              취소
            </Button>
            <Button
              variant={c?.destructive ? "destructive" : "default"}
              onClick={async () => {
                if (confirm) await onAct(confirm);
                setConfirm(null);
              }}
            >
              {c?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
