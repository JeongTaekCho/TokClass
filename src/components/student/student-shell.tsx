"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { Bell, BookOpen, Eye, FileText, FolderOpen, KeyRound, LayoutGrid, LogOut, MessageCircle, MessagesSquare, UserRound } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { AnnouncementBar } from "@/components/room/announcements";
import { BoardPanel } from "@/components/room/board/board-panel";
import { ChatPanel } from "@/components/room/chat-panel";
import { ConnectionBadge } from "@/components/room/connection-badge";
import { DmThread } from "@/components/room/dm-thread";
import { QaPanel } from "@/components/room/qa-panel";
import { ResourcesPanel } from "@/components/room/resources-panel";
import { StudentSlides } from "@/components/room/slides/student-slides";
import { ActivityPopup } from "@/components/student/activity-popup";
import { BottomBar } from "@/components/student/bottom-bar";
import { GroupBanner } from "@/components/student/group-banner";
import { SessionLost } from "@/components/student/session-lost";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api, fetcher } from "@/lib/client/api";
import { copyText } from "@/lib/client/clipboard";
import { forgetPassword, readPassword } from "@/lib/client/password-store";
import { toastError } from "@/lib/client/toast-error";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import { TAB_LABELS, type TabKey } from "@/lib/rooms/templates";
import type { DirectMessage, Me, PublicRoom } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TAB_ICONS: Record<TabKey, typeof FileText> = {
  slides: FileText,
  chat: MessageCircle,
  qa: MessagesSquare,
  board: LayoutGrid,
  resources: FolderOpen,
};

/** 내 정보(조 배정 등)는 바뀔 수 있어서 따로 받아와요. */
export function useMe() {
  const { roomId, me: initialMe } = useRoom();
  const { data, mutate } = useSWR<{ room: PublicRoom; me: Me }>(`/api/rooms/${roomId}`, fetcher, { revalidateOnFocus: false });
  useRoomEvent("group.changed", () => void mutate());
  return data?.me ?? initialMe;
}

export function StudentShell({ code }: { code: string }) {
  const { room, roomId, sessionLost } = useRoom();
  const me = useMe();
  const enabledTabs = room.settings.tabs.filter((t) => t.enabled).map((t) => t.key);
  const [activeTab, setActiveTab] = useState<TabKey>(enabledTabs.includes(room.settings.defaultTab) ? room.settings.defaultTab : (enabledTabs[0] ?? "chat"));
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set([activeTab]));
  const [unread, setUnread] = useState<Partial<Record<TabKey, number>>>({});
  const [dmOpen, setDmOpen] = useState(false);
  const [chatScope, setChatScope] = useState<"all" | "group">("all");

  const current: TabKey = enabledTabs.includes(activeTab) ? activeTab : (enabledTabs[0] ?? "chat");
  const groupMode = room.settings.groups.active && me.kind === "participant" && Boolean(me.groupId);

  const selectTab = (key: TabKey) => {
    setActiveTab(key);
    setVisited((prev) => new Set(prev).add(key));
    setUnread((u) => ({ ...u, [key]: 0 }));
  };
  const bump = (key: TabKey) => {
    if (key !== current) setUnread((u) => ({ ...u, [key]: (u[key] ?? 0) + 1 }));
  };
  useRoomEvent("chat.message", ({ message }) => {
    if (message.author.id !== me.id && (!message.groupId || message.groupId === (me.kind === "participant" ? me.groupId : null))) bump("chat");
  });
  useRoomEvent("qa.changed", ({ question }) => {
    if (question && !question.mine && Date.now() - new Date(question.createdAt).getTime() < 5000) bump("qa");
  });
  useRoomEvent("submission.changed", () => bump("board"));

  // 1:1 메시지 안 읽은 수
  const dmKey = `/api/rooms/${roomId}/dms`;
  const { data: dmData, mutate: mutateDm } = useSWR<{ messages: DirectMessage[]; unread: number }>(dmKey, fetcher, { revalidateOnFocus: false });
  useRoomEvent("dm.new", (p) => {
    if (p.participantId === me.id && p.fromInstructor) {
      void mutateDm();
      if (!dmOpen) toast("강사님이 1:1 메시지를 보냈어요", { action: { label: "보기", onClick: () => setDmOpen(true) } });
    }
  });
  const dmUnread = dmOpen ? 0 : (dmData?.unread ?? 0);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="z-20 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3">
          <LogoMark className="size-8 shrink-0" title="톡클" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] leading-tight font-bold">{room.title}</h1>
            <ConnectionBadge />
          </div>
          <Button variant="ghost" size="icon" className="relative" aria-label={`강사 1:1 메시지${dmUnread ? `, 안 읽은 메시지 ${dmUnread}개` : ""}`} onClick={() => setDmOpen(true)}>
            <Bell aria-hidden />
            {dmUnread > 0 && <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">{dmUnread}</span>}
          </Button>
          <ProfileMenu code={code} />
        </div>
        {enabledTabs.length > 1 && (
          <nav className="scrollbar-thin mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-1.5" aria-label="수업 탭" role="tablist">
            {enabledTabs.map((key) => {
              const Icon = TAB_ICONS[key];
              const count = unread[key] ?? 0;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={current === key}
                  aria-controls={`panel-${key}`}
                  id={`tab-${key}`}
                  onClick={() => selectTab(key)}
                  className={cn(
                    "relative inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition",
                    current === key ? "bg-primary-soft text-primary-hover" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {TAB_LABELS[key]}
                  {count > 0 && (
                    <span className="ml-0.5 rounded-full bg-coral px-1.5 text-[11px] leading-5 font-bold text-white" aria-label={`새 소식 ${count}개`}>
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      <AnnouncementBar />
      <GroupBanner me={me} />

      {room.status === "ended" && (
        <div className="bg-muted px-4 py-2 text-center text-sm">
          수업이 끝났어요.{" "}
          <Link href={`/r/${code}/review`} className="font-semibold text-primary underline">
            복습 페이지
          </Link>
          에서 기록을 다시 볼 수 있어요.
        </div>
      )}

      <main className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
        {enabledTabs.map((key) =>
          visited.has(key) || key === current ? (
            <section
              key={key}
              id={`panel-${key}`}
              role="tabpanel"
              aria-labelledby={`tab-${key}`}
              hidden={key !== current}
              className={cn("min-h-0 flex-1 flex-col", key === current ? "flex" : "hidden")}
            >
              {key === "slides" && <StudentSlides />}
              {key === "chat" && (
                <>
                  {groupMode && (
                    <div className="flex gap-1 border-b border-border px-3 py-2" role="group" aria-label="채팅 범위">
                      {(["all", "group"] as const).map((s) => (
                        <Button key={s} size="sm" variant={chatScope === s ? "soft" : "ghost"} onClick={() => setChatScope(s)} aria-pressed={chatScope === s}>
                          {s === "all" ? "전체 채팅" : "우리 조 채팅"}
                        </Button>
                      ))}
                    </div>
                  )}
                  {groupMode && chatScope === "group" && me.kind === "participant" ? <ChatPanel key={`g-${me.groupId}`} groupId={me.groupId} /> : <ChatPanel key="main" />}
                </>
              )}
              {key === "qa" && <QaPanel />}
              {key === "board" && <BoardPanel />}
              {key === "resources" && <ResourcesPanel />}
            </section>
          ) : null,
        )}
        {enabledTabs.length === 0 && <p className="m-auto text-muted-foreground">강사님이 아직 탭을 열지 않았어요.</p>}
      </main>

      <BottomBar />
      <ActivityPopup />

      <Sheet open={dmOpen} onOpenChange={setDmOpen}>
        <SheetContent side="right" className="gap-0 p-0">
          <SheetHeader className="border-b border-border">
            <SheetTitle>강사 1:1 메시지</SheetTitle>
            <SheetDescription>나와 강사님만 볼 수 있어요.</SheetDescription>
          </SheetHeader>
          {dmOpen && <DmThread onRead={() => void mutateDm()} />}
        </SheetContent>
      </Sheet>

      {sessionLost && <SessionLost reason={sessionLost} code={code} />}
    </div>
  );
}

function ProfileMenu({ code }: { code: string }) {
  const { roomId, me } = useRoom();
  const router = useRouter();
  const [pwOpen, setPwOpen] = useState(false);
  const [password, setPassword] = useState<string | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="내 프로필">
            <UserRound aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-sm text-foreground">{me.nickname}님</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setPassword(readPassword(roomId));
              setPwOpen(true);
            }}
          >
            <KeyRound aria-hidden /> 비밀번호 다시 보기
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/r/${code}/review`}>
              <BookOpen aria-hidden /> 복습 페이지
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={async () => {
              if (!confirm("이 기기에서 나갈까요? 비밀번호로 다시 들어올 수 있어요.")) return;
              try {
                await api(`/api/rooms/${roomId}/leave`, { method: "POST" });
                forgetPassword(roomId);
                router.replace(`/join/${code}`);
                router.refresh();
              } catch (e) {
                toastError(e);
              }
            }}
          >
            <LogOut aria-hidden /> 이 기기에서 나가기
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>내 임시 비밀번호</DialogTitle>
            <DialogDescription>다른 기기나 다음 수업에서 이 비밀번호로 다시 들어올 수 있어요.</DialogDescription>
          </DialogHeader>
          {password ? (
            <div className="rounded-2xl bg-primary-soft p-5 text-center">
              <p className="font-mono text-3xl font-extrabold tracking-[0.3em] text-primary-hover">{password}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => copyText(password, "비밀번호를 복사했어요.")}>
                복사
              </Button>
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm">
              <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
              보안을 위해 비밀번호는 처음 받은 기기의 이 브라우저 탭에서만 다시 볼 수 있어요. 잊어버렸다면 강사님께 재발급을 요청해 주세요.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
