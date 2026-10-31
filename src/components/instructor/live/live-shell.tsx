"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Focus, Gauge, Hand, Lock, LockOpen, Megaphone, PanelRightClose, PanelRightOpen, Sparkles, Users, X } from "lucide-react";

import { ActivityPanel } from "@/components/instructor/live/activity-panel";
import { DmInbox } from "@/components/instructor/live/dm-inbox";
import { HelpQueue } from "@/components/instructor/live/help-queue";
import { JoinInfo } from "@/components/instructor/live/join-info";
import { UnderstandingPanel } from "@/components/instructor/live/understanding-panel";
import { AnnouncementManager } from "@/components/room/announcements";
import { ClassroomShell } from "@/components/room/classroom-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { PublicRoom } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 강사 수업 화면: 수강생과 같은 수업 화면(ClassroomShell) 위에 강사 전용 도구만 더해요.
 * - 진행 도구 줄: 참여코드·QR, 집중 모드, 입장 마감
 * - 강사 도구 패널: 이해도, 도움 요청, 활동 운영, 공지·1:1 메시지
 */
export function LiveShell() {
  const { room, roomId, setRoom, online } = useRoom();
  const onlineStudents = [...online.values()].filter((m) => m.kind === "participant").length;
  // 넓은 화면은 옆에 펼쳐 두고, 좁은 화면은 버튼으로 열어요. 패널은 늘 마운트해서 도움 요청 수를 계속 세요.
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpCount, setHelpCount] = useState(0);
  const [toolTab, setToolTab] = useState("understanding");

  // 수강생이 먼저 보낸 1:1 메시지도 놓치지 않도록: 안 읽은 수 배지 + 알림
  const { data: dmData, mutate: mutateDm } = useSWR<{ threads: { participantId: string; unread: number }[] }>(`/api/rooms/${roomId}/dms`, fetcher);
  const dmUnread = (dmData?.threads ?? []).reduce((n, t) => n + t.unread, 0);
  const openMessages = () => {
    setToolTab("messages");
    setDesktopOpen(true);
    setMobileOpen(true);
  };
  useRoomEvent("dm.new", ({ participantId, fromInstructor }) => {
    void mutateDm();
    if (fromInstructor) return;
    const name = online.get(participantId)?.nickname ?? "수강생";
    toast(`${name}님이 1:1 메시지를 보냈어요`, { action: { label: "보기", onClick: openMessages } });
  });

  async function toggle(body: Record<string, boolean>) {
    try {
      const res = await api<{ room: PublicRoom }>(`/api/rooms/${roomId}`, { method: "PATCH", body });
      setRoom(res.room);
    } catch (e) {
      toastError(e);
    }
  }

  const badge = (n: number) => n > 0 && <span className="rounded-full bg-coral px-1.5 text-[11px] leading-5 font-bold text-white">{n}</span>;
  const helpBadge = badge(helpCount);
  const dmBadge = badge(dmUnread);
  const totalBadge = badge(helpCount + dmUnread);

  return (
    <ClassroomShell
      heightClass="h-[calc(100dvh-4rem)]"
      headerActions={
        <>
          <span className="inline-flex items-center gap-1 px-1 text-sm text-muted-foreground" title="지금 접속한 수강생">
            <Users className="size-4" aria-hidden /> {onlineStudents}명
          </span>
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen}>
            <PanelRightOpen aria-hidden /> 강사 도구 {totalBadge}
          </Button>
          <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={() => setDesktopOpen((v) => !v)} aria-expanded={desktopOpen}>
            {desktopOpen ? <PanelRightClose aria-hidden /> : <PanelRightOpen aria-hidden />} 강사 도구 {!desktopOpen && totalBadge}
          </Button>
        </>
      }
      toolbar={
        <div className="border-t border-border bg-muted/40">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-3 py-1.5">
            <span className="text-xs font-semibold text-muted-foreground">강사만 보여요</span>
            <JoinInfo />
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
      }
      endedNotice="종료된 수업이에요. 설정에서 다시 열 수 있어요."
      tools={
        <aside
          aria-label="강사 도구"
          className={cn(
            "min-h-0 flex-col border-l border-border bg-card",
            mobileOpen ? "fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] shadow-lifted" : "hidden",
            desktopOpen ? "lg:static lg:z-auto lg:flex lg:w-[400px] lg:max-w-none lg:shrink-0 lg:shadow-none" : "lg:hidden",
          )}
        >
          <ToolsPanel tab={toolTab} onTab={setToolTab} onHelpCount={setHelpCount} helpBadge={helpBadge} dmBadge={dmBadge} onClose={() => setMobileOpen(false)} />
        </aside>
      }
      overlay={mobileOpen && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />}
    />
  );
}

/** 강사 전용 도구 (수강생 화면에는 없어요) */
function ToolsPanel({
  tab,
  onTab,
  onHelpCount,
  helpBadge,
  dmBadge,
  onClose,
}: {
  tab: string;
  onTab: (tab: string) => void;
  onHelpCount: (n: number) => void;
  helpBadge: React.ReactNode;
  dmBadge: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Tabs value={tab} onValueChange={onTab} className="flex min-h-0 flex-1 flex-col gap-0">
      <div className="flex items-center gap-1 border-b border-border p-2">
        <TabsList className="grid flex-1 grid-cols-4">
          <TabsTrigger value="understanding">
            <Gauge aria-hidden /> 이해도
          </TabsTrigger>
          <TabsTrigger value="help" aria-label="도움 요청">
            <Hand aria-hidden /> 도움 {helpBadge}
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Sparkles aria-hidden /> 활동
          </TabsTrigger>
          <TabsTrigger value="messages" aria-label="공지와 1:1 메시지">
            <Megaphone aria-hidden /> 공지·1:1 {dmBadge}
          </TabsTrigger>
        </TabsList>
        <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="강사 도구 닫기" onClick={onClose}>
          <X aria-hidden />
        </Button>
      </div>
      <TabsContent value="understanding" forceMount hidden={tab !== "understanding"} className="scrollbar-thin min-h-0 overflow-y-auto p-3 data-[state=inactive]:hidden">
        <UnderstandingPanel />
      </TabsContent>
      <TabsContent value="help" forceMount hidden={tab !== "help"} className="scrollbar-thin min-h-0 overflow-y-auto p-3 data-[state=inactive]:hidden">
        <HelpQueue onCount={onHelpCount} />
      </TabsContent>
      <TabsContent value="activity" forceMount hidden={tab !== "activity"} className="scrollbar-thin min-h-0 overflow-y-auto p-3 data-[state=inactive]:hidden">
        <p className="mb-2 text-xs text-muted-foreground">활동을 시작하면 수강생 화면에 팝업으로 떠요.</p>
        <ActivityPanel />
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
  );
}
