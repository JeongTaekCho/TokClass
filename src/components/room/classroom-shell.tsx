"use client";

import { useState } from "react";
import useSWR from "swr";
import { FolderOpen, MessageCircleQuestion, MessagesSquare, Presentation, StickyNote, type LucideIcon } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { ActiveIndicator, Pop } from "@/components/motion";
import { AnnouncementBar } from "@/components/room/announcements";
import { BoardPanel } from "@/components/room/board/board-panel";
import { ChatPanel } from "@/components/room/chat-panel";
import { ConnectionBadge } from "@/components/room/connection-badge";
import { QaPanel } from "@/components/room/qa-panel";
import { ResourcesPanel } from "@/components/room/resources-panel";
import { ClassSlides } from "@/components/room/slides/class-slides";
import { GroupBanner } from "@/components/student/group-banner";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/client/api";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import { TAB_LABELS, type TabKey } from "@/lib/rooms/templates";
import type { Group, Me, PublicRoom } from "@/lib/types";
import { cn } from "@/lib/utils";

const TAB_ICONS: Record<TabKey, LucideIcon> = {
  slides: Presentation,
  chat: MessagesSquare,
  qa: MessageCircleQuestion,
  board: StickyNote,
  resources: FolderOpen,
};

/** 내 정보(조 배정 등)는 바뀔 수 있어서 따로 받아와요. */
export function useMe() {
  const { roomId, me: initialMe } = useRoom();
  const { data, mutate } = useSWR<{ room: PublicRoom; me: Me }>(`/api/rooms/${roomId}`, fetcher, { revalidateOnFocus: false });
  useRoomEvent("group.changed", () => void mutate());
  return data?.me ?? initialMe;
}

/**
 * 수업 화면 (강사·수강생 공용).
 * 탭 구성·순서·첫 화면, 교안·채팅·Q&A·산출물·자료실, 공지·조 안내가 모두 같은 모양이라
 * 강사가 보는 화면 그대로 수강생이 따라 할 수 있어요. 역할별 기능만 슬롯으로 끼워 넣어요.
 * - headerActions: 제목 줄 오른쪽 (수강생: 1:1·프로필 / 강사: 접속 수·강사 도구 열기)
 * - toolbar: 강사 전용 진행 도구 줄
 * - tools: 강사 전용 옆 패널
 * - footer / overlay: 수강생 하단 바, 활동 팝업, 다이얼로그 등
 */
export function ClassroomShell({
  heightClass,
  headerActions,
  toolbar,
  endedNotice,
  tools,
  footer,
  overlay,
}: {
  heightClass: string;
  headerActions?: React.ReactNode;
  toolbar?: React.ReactNode;
  endedNotice: React.ReactNode;
  tools?: React.ReactNode;
  footer?: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  const { room, me: initialMe } = useRoom();
  const me = useMe();
  const isInstructor = initialMe.kind === "instructor";
  const enabledTabs = room.settings.tabs.filter((t) => t.enabled).map((t) => t.key);
  const [activeTab, setActiveTab] = useState<TabKey>(enabledTabs.includes(room.settings.defaultTab) ? room.settings.defaultTab : (enabledTabs[0] ?? "chat"));
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set([activeTab]));
  const [unread, setUnread] = useState<Partial<Record<TabKey, number>>>({});

  const current: TabKey = enabledTabs.includes(activeTab) ? activeTab : (enabledTabs[0] ?? "chat");

  const selectTab = (key: TabKey) => {
    setActiveTab(key);
    setVisited((prev) => new Set(prev).add(key));
    setUnread((u) => ({ ...u, [key]: 0 }));
  };
  const bump = (key: TabKey) => {
    if (key !== current) setUnread((u) => ({ ...u, [key]: (u[key] ?? 0) + 1 }));
  };
  const isMine = (author: { kind: "instructor" | "participant"; id: string | null }) => author.kind === me.kind && (author.id ?? me.id) === me.id;
  useRoomEvent("chat.message", ({ message }) => {
    if (!isMine(message.author)) bump("chat");
  });
  useRoomEvent("chat.group", ({ groupId, author }) => {
    const myGroup = me.kind === "participant" ? me.groupId : null;
    if (!isMine(author) && (isInstructor || groupId === myGroup)) bump("chat");
  });
  useRoomEvent("qa.changed", ({ question }) => {
    if (question && !question.mine && Date.now() - new Date(question.createdAt).getTime() < 5000) bump("qa");
  });
  useRoomEvent("submission.changed", () => bump("board"));

  return (
    <div className={cn("flex flex-col bg-background", heightClass)}>
      <header className="z-20 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-3 sm:px-4">
          {/* 강사 화면은 위에 사이트 헤더가 있어서 로고를 한 번만 보여줘요. */}
          {!isInstructor && <LogoMark className="size-9 shrink-0" title="톡클" />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base leading-tight font-bold">{room.title}</h1>
            <ConnectionBadge className="mt-0.5" />
          </div>
          {headerActions}
        </div>
        {enabledTabs.length > 1 && (
          <nav className="scrollbar-none mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2 sm:px-3" aria-label="수업 탭" role="tablist">
            {enabledTabs.map((key) => {
              const count = unread[key] ?? 0;
              const Icon = TAB_ICONS[key];
              const active = current === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${key}`}
                  id={`tab-${key}`}
                  onClick={() => selectTab(key)}
                  className={cn(
                    "press relative isolate inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3.5 text-[15px] transition-colors duration-150",
                    active ? "font-semibold text-primary-foreground" : "font-medium text-muted-foreground hover:bg-sunken hover:text-foreground",
                  )}
                >
                  {active && <ActiveIndicator layoutId={`class-tab-${isInstructor ? "i" : "s"}`} className="absolute inset-0 -z-10 rounded-md bg-primary shadow-brand" />}
                  <Icon aria-hidden className="relative size-[18px]" strokeWidth={2} />
                  <span className="relative">{TAB_LABELS[key]}</span>
                  {count > 0 && (
                    <Pop key={count} className="relative rounded-full bg-coral px-1.5 text-[11px] leading-5 font-bold text-ink tabular-nums" aria-label={`새 소식 ${count}개`}>
                      {count > 99 ? "99+" : count}
                    </Pop>
                  )}
                </button>
              );
            })}
          </nav>
        )}
        {toolbar}
      </header>

      <AnnouncementBar />
      <GroupBanner me={me} />
      {room.status === "ended" && <div className="border-b border-border bg-sun-soft px-4 py-2 text-center text-sm font-medium">{endedNotice}</div>}

      <div className="flex min-h-0 flex-1">
        <main className="relative mx-auto flex min-h-0 w-full max-w-5xl min-w-0 flex-1 flex-col">
          {enabledTabs.map((key) =>
            visited.has(key) || key === current ? (
              <section
                key={key}
                id={`panel-${key}`}
                role="tabpanel"
                aria-labelledby={`tab-${key}`}
                hidden={key !== current}
                className={cn("min-h-0 flex-1 flex-col", key === current ? "flex animate-fade-in" : "hidden")}
              >
                {key === "slides" && <ClassSlides />}
                {key === "chat" && <ClassChat me={me} />}
                {key === "qa" && <QaPanel />}
                {key === "board" && <BoardPanel />}
                {key === "resources" && <ResourcesPanel manage={isInstructor} />}
              </section>
            ) : null,
          )}
          {enabledTabs.length === 0 && (
            <p className="m-auto text-muted-foreground">{isInstructor ? "켜진 탭이 없어요. 설정에서 수강생에게 보여줄 탭을 켜 주세요." : "강사님이 아직 탭을 열지 않았어요."}</p>
          )}
        </main>
        {tools}
      </div>

      {footer}
      {overlay}
    </div>
  );
}

/** 채팅: 수강생은 전체/우리 조, 강사는 전체/조별로 골라 봐요. */
function ClassChat({ me }: { me: Me }) {
  const { room, roomId } = useRoom();
  const [scope, setScope] = useState<string | null>(null);
  const groupsActive = room.settings.groups.active;
  const { data, mutate } = useSWR<{ groups: Group[] }>(groupsActive && me.kind === "instructor" ? `/api/rooms/${roomId}/groups` : null, fetcher);
  useRoomEvent("group.changed", () => void mutate());

  if (me.kind === "participant") {
    const groupMode = groupsActive && Boolean(me.groupId);
    const inGroup = groupMode && scope === "group";
    return (
      <>
        {groupMode && (
          <div className="flex gap-1 border-b border-border px-3 py-2" role="group" aria-label="채팅 범위">
            {([null, "group"] as const).map((s) => (
              <Button key={s ?? "all"} size="sm" variant={scope === s ? "soft" : "ghost"} onClick={() => setScope(s)} aria-pressed={scope === s}>
                {s ? "우리 조 채팅" : "전체 채팅"}
              </Button>
            ))}
          </div>
        )}
        {inGroup ? <ChatPanel key={`g-${me.groupId}`} groupId={me.groupId} /> : <ChatPanel key="main" />}
      </>
    );
  }

  const groups = groupsActive ? (data?.groups ?? []) : [];
  const selected = groups.some((g) => g.id === scope) ? scope : null;
  return (
    <>
      {groups.length > 0 && (
        <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-border px-3 py-2" role="group" aria-label="채팅 범위">
          <Button size="sm" variant={selected === null ? "soft" : "ghost"} onClick={() => setScope(null)} aria-pressed={selected === null}>
            전체 채팅
          </Button>
          {groups.map((g) => (
            <Button key={g.id} size="sm" variant={selected === g.id ? "soft" : "ghost"} onClick={() => setScope(g.id)} aria-pressed={selected === g.id}>
              {g.name}
            </Button>
          ))}
        </div>
      )}
      <ChatPanel key={selected ?? "main"} groupId={selected} />
    </>
  );
}
