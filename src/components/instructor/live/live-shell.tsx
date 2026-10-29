"use client";

import { useState } from "react";
import useSWR from "swr";
import { FolderOpen, Hand, Lock, LockOpen, MessageCircle, MessagesSquare, Megaphone, Gauge, Users, Focus } from "lucide-react";

import { AnnouncementBar, AnnouncementManager } from "@/components/room/announcements";
import { ChatPanel } from "@/components/room/chat-panel";
import { ConnectionBadge } from "@/components/room/connection-badge";
import { QaPanel } from "@/components/room/qa-panel";
import { ResourcesPanel } from "@/components/room/resources-panel";
import { ActivityPanel } from "@/components/instructor/live/activity-panel";
import { DmInbox } from "@/components/instructor/live/dm-inbox";
import { HelpQueue } from "@/components/instructor/live/help-queue";
import { InstructorSlides } from "@/components/instructor/live/instructor-slides";
import { JoinInfo } from "@/components/instructor/live/join-info";
import { UnderstandingPanel } from "@/components/instructor/live/understanding-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Group, PublicRoom } from "@/lib/types";

export function LiveShell() {
  const { room, roomId, setRoom, online } = useRoom();
  const [side, setSide] = useState("understanding");
  const [chatGroup, setChatGroup] = useState<string | null>(null);
  const [helpCount, setHelpCount] = useState(0);
  const onlineStudents = [...online.values()].filter((m) => m.kind === "participant").length;
  const { data: groupData, mutate: mutateGroups } = useSWR<{ groups: Group[] }>(room.settings.groups.active ? `/api/rooms/${roomId}/groups` : null, fetcher);
  useRoomEvent("group.changed", () => void mutateGroups());

  async function toggle(body: Record<string, boolean>) {
    try {
      const res = await api<{ room: PublicRoom }>(`/api/rooms/${roomId}`, { method: "PATCH", body });
      setRoom(res.room);
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
          <JoinInfo />
          <span className="inline-flex items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground" title="지금 접속한 수강생">
            <Users className="size-4" aria-hidden /> 접속 {onlineStudents}명
          </span>
          <ConnectionBadge />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant={room.focusMode ? "default" : "outline"} size="sm" aria-pressed={room.focusMode} onClick={() => toggle({ focusMode: !room.focusMode })}>
              <Focus aria-hidden /> 집중 모드 {room.focusMode ? "켜짐" : "꺼짐"}
            </Button>
            <Button variant={room.locked ? "default" : "outline"} size="sm" aria-pressed={room.locked} onClick={() => toggle({ locked: !room.locked })}>
              {room.locked ? <Lock aria-hidden /> : <LockOpen aria-hidden />} 입장 {room.locked ? "마감" : "열림"}
            </Button>
          </div>
        </div>
      </div>
      <AnnouncementBar />
      {room.status === "ended" && <p className="bg-muted px-4 py-2 text-center text-sm">종료된 수업이에요. 설정에서 다시 열 수 있어요.</p>}

      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 gap-4 p-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          <InstructorSlides />
          <ActivityPanel />
          <details className="group rounded-2xl border border-border bg-card shadow-soft">
            <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 font-bold">
              <FolderOpen className="size-4 text-primary" aria-hidden /> 자료실 관리
              <span className="text-sm font-normal text-muted-foreground">다운로드 파일·실습 링크</span>
            </summary>
            <ResourcesPanel manage />
          </details>
        </div>

        <aside className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft lg:sticky lg:top-20 lg:h-[calc(100dvh-7rem)]">
          <Tabs value={side} onValueChange={setSide} className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList className="m-2 grid w-auto grid-cols-5">
              <TabsTrigger value="understanding" aria-label="이해도">
                <Gauge aria-hidden />
                <span className="hidden xl:inline">이해도</span>
              </TabsTrigger>
              <TabsTrigger value="qa" aria-label="Q&A">
                <MessagesSquare aria-hidden />
                <span className="hidden xl:inline">Q&A</span>
              </TabsTrigger>
              <TabsTrigger value="help" aria-label={`도움 요청 ${helpCount}건`} className="relative">
                <Hand aria-hidden />
                <span className="hidden xl:inline">도움</span>
                {helpCount > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-coral px-1.5 text-[10px] leading-4 font-bold text-white">{helpCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="chat" aria-label="채팅">
                <MessageCircle aria-hidden />
                <span className="hidden xl:inline">채팅</span>
              </TabsTrigger>
              <TabsTrigger value="messages" aria-label="공지와 1:1 메시지">
                <Megaphone aria-hidden />
                <span className="hidden xl:inline">공지</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="understanding" forceMount hidden={side !== "understanding"} className="scrollbar-thin min-h-0 overflow-y-auto p-3 data-[state=inactive]:hidden">
              <UnderstandingPanel />
            </TabsContent>
            <TabsContent value="qa" className="flex min-h-0 flex-col data-[state=inactive]:hidden">
              <QaPanel />
            </TabsContent>
            <TabsContent value="help" forceMount hidden={side !== "help"} className="scrollbar-thin min-h-0 overflow-y-auto p-3 data-[state=inactive]:hidden">
              <HelpQueue onCount={setHelpCount} />
            </TabsContent>
            <TabsContent value="chat" className="flex min-h-0 flex-col data-[state=inactive]:hidden">
              {room.settings.groups.active && (groupData?.groups.length ?? 0) > 0 && (
                <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
                  <Button size="sm" variant={chatGroup === null ? "soft" : "ghost"} onClick={() => setChatGroup(null)}>
                    전체
                  </Button>
                  {groupData!.groups.map((g) => (
                    <Button key={g.id} size="sm" variant={chatGroup === g.id ? "soft" : "ghost"} onClick={() => setChatGroup(g.id)}>
                      {g.name}
                    </Button>
                  ))}
                </div>
              )}
              <ChatPanel key={chatGroup ?? "main"} groupId={chatGroup} />
            </TabsContent>
            <TabsContent value="messages" className="scrollbar-thin flex min-h-0 flex-col overflow-y-auto data-[state=inactive]:hidden">
              <div className="border-b border-border p-3">
                <h3 className="mb-2 font-bold">공지</h3>
                <AnnouncementManager />
              </div>
              <h3 className="px-3 pt-3 font-bold">1:1 메시지</h3>
              <DmInbox />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
