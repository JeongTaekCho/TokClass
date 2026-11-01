"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { ArrowDown, Code2, ImagePlus, Loader2, Lock, SendHorizontal } from "lucide-react";

import { DayDivider, MessageItem } from "@/components/room/chat-message";
import { EmptyState } from "@/components/empty-state";
import { motion, spring } from "@/components/motion";
import { ChatEmptyArt } from "@/components/illustrations";
import { ChatSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { INSTRUCTOR_REACTOR, toggleReaction } from "@/lib/chat/reactions";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { uploadFile } from "@/lib/client/upload";
import { formatDay } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { ChatMessage, MessageReaction } from "@/lib/types";
import { cn } from "@/lib/utils";

type Page = { messages: ChatMessage[]; hasMore: boolean };

function mergeMessages(...lists: ChatMessage[][]) {
  const map = new Map<string, ChatMessage>();
  for (const list of lists) for (const m of list) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

const RUN_GAP = 3 * 60_000;
const authorKey = (m: ChatMessage) => (m.author.kind === "instructor" ? INSTRUCTOR_REACTOR : (m.author.id ?? m.author.nickname));

/** 같은 사람이 3분 안에 이어 보낸 메시지는 한 묶음으로 보여요 (이름·아바타는 처음, 시간은 마지막에만). */
function sameRun(a: ChatMessage | undefined, b: ChatMessage | undefined) {
  return !!a && !!b && authorKey(a) === authorKey(b) && formatDay(a.createdAt) === formatDay(b.createdAt) && Date.parse(b.createdAt) - Date.parse(a.createdAt) < RUN_GAP;
}

export function ChatPanel({ groupId = null, readOnly = false, className }: { groupId?: string | null; readOnly?: boolean; className?: string }) {
  const { roomId, me, room } = useRoom();
  const key = `/api/rooms/${roomId}/messages${groupId ? `?group=${groupId}` : ""}`;
  const { data, isLoading, mutate } = useSWR<Page>(key, fetcher, { revalidateOnFocus: false });
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);
  const [live, setLive] = useState<ChatMessage[]>([]);
  const [hiddenOverride, setHiddenOverride] = useState<Record<string, boolean>>({});
  const [reactionOverride, setReactionOverride] = useState<Record<string, MessageReaction[]>>({});
  const [newCount, setNewCount] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const prevHeight = useRef<number | null>(null);

  const messages = useMemo(() => mergeMessages(older, data?.messages ?? [], live), [older, data, live]);
  const hasMore = olderHasMore ?? data?.hasMore ?? false;

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setNewCount(0);
  }, []);

  useRoomEvent("chat.message", ({ message }) => {
    if ((message.groupId ?? null) !== (groupId ?? null)) return;
    setLive((prev) => [...prev, message]);
    if (!nearBottom.current && message.author.id !== me.id) setNewCount((n) => n + 1);
  });
  useRoomEvent("chat.hidden", ({ id, hidden }) => {
    setHiddenOverride((prev) => ({ ...prev, [id]: hidden }));
    if (!hidden) void mutate();
  });
  useRoomEvent("chat.reactions", ({ id, reactions }) => {
    setReactionOverride((prev) => ({ ...prev, [id]: reactions }));
  });

  // 새 메시지가 오면 바닥 근처일 때만 자동으로 내려가요.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prevHeight.current !== null) {
      // 이전 메시지를 불러온 경우 스크롤 위치 유지
      el.scrollTop = el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
      return;
    }
    if (nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const oldest = messages[0]!;
      const res = await api<Page>(`${key}${key.includes("?") ? "&" : "?"}before=${encodeURIComponent(oldest.createdAt)}`);
      prevHeight.current = scrollRef.current?.scrollHeight ?? null;
      setOlder((prev) => mergeMessages(res.messages, prev));
      setOlderHasMore(res.hasMore);
    } catch (e) {
      toastError(e);
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMore, key, loadingOlder, messages]);

  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadOlder();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [loadOlder]);

  const locked = me.kind === "participant" && room.focusMode;
  const disabled = readOnly || room.status === "ended";
  const myKey = me.kind === "instructor" ? INSTRUCTOR_REACTOR : me.id;
  const reactionsOf = (m: ChatMessage) => reactionOverride[m.id] ?? m.reactions ?? [];

  async function react(m: ChatMessage, emoji: string) {
    const before = reactionsOf(m);
    setReactionOverride((prev) => ({ ...prev, [m.id]: toggleReaction(before, emoji, { key: myKey, name: me.kind === "instructor" ? "강사" : me.nickname }) }));
    try {
      const res = await api<{ reactions: MessageReaction[] }>(`/api/rooms/${roomId}/messages/${m.id}/reactions`, { body: { emoji } });
      setReactionOverride((prev) => ({ ...prev, [m.id]: res.reactions }));
    } catch (e) {
      setReactionOverride((prev) => ({ ...prev, [m.id]: before }));
      toastError(e);
    }
  }

  async function toggleHidden(m: ChatMessage, hidden: boolean) {
    try {
      await api(`/api/rooms/${roomId}/messages/${m.id}`, { method: "PATCH", body: { hidden: !hidden } });
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        ref={scrollRef}
        className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto bg-background px-3 pt-1 pb-4"
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          if (nearBottom.current) setNewCount(0);
        }}
        role="log"
        aria-live="polite"
        aria-label="채팅 메시지"
      >
        <div ref={topRef} className="h-1" />
        {loadingOlder && <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" aria-label="이전 메시지 불러오는 중" />}
        {!hasMore && messages.length > 0 && (
          <p className="pt-3 text-center">
            <span className="inline-flex rounded-full bg-sunken px-3 py-1 text-xs font-medium text-muted-foreground">대화의 처음이에요 👋</span>
          </p>
        )}
        {isLoading && <ChatSkeleton />}
        {!isLoading && messages.length === 0 && (
          <EmptyState className="mt-6" art={<ChatEmptyArt />} title="아직 조용해요">
            첫 메시지를 남겨 보세요 👋
          </EmptyState>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const hidden = hiddenOverride[m.id] ?? m.hidden;
          return (
            <Fragment key={m.id}>
              {(!prev || formatDay(prev.createdAt) !== formatDay(m.createdAt)) && <DayDivider iso={m.createdAt} />}
              <MessageItem
                m={m}
                hidden={hidden}
                mine={m.author.kind === me.kind && (m.author.id ?? me.id) === me.id}
                first={!sameRun(prev, m)}
                last={!sameRun(m, messages[i + 1])}
                reactions={reactionsOf(m)}
                myKey={myKey}
                canReact={!disabled && !locked}
                canModerate={me.kind === "instructor"}
                onReact={(emoji) => void react(m, emoji)}
                onToggleHidden={() => void toggleHidden(m, hidden)}
              />
            </Fragment>
          );
        })}
      </div>
      {newCount > 0 && (
        <div className="pointer-events-none relative">
          <Button size="sm" className="pointer-events-auto absolute -top-12 left-1/2 -translate-x-1/2 animate-rise rounded-full shadow-overlay" onClick={() => scrollToBottom(true)}>
            <ArrowDown aria-hidden /> 새 메시지 {newCount}개
          </Button>
        </div>
      )}
      {!disabled && (locked ? (
        <p className="flex items-center justify-center gap-2 border-t border-border bg-sunken px-4 py-3 text-sm text-muted-foreground">
          <Lock className="size-4" aria-hidden /> 집중 모드예요. 잠시 채팅이 잠겨 있어요.
        </p>
      ) : (
        <Composer
          roomId={roomId}
          onSend={async (body, imagePath) => {
            const res = await api<{ message: ChatMessage }>(`/api/rooms/${roomId}/messages`, { body: { body, imagePath, groupId } });
            nearBottom.current = true;
            setLive((prev) => [...prev, res.message]);
          }}
        />
      ))}
    </div>
  );
}

function Composer({ roomId, onSend }: { roomId: string; onSend: (body: string, imagePath: string | null) => Promise<void> }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  async function send(imagePath: string | null = null) {
    const body = text.trim();
    if (!body && !imagePath) return;
    setSending(true);
    try {
      await onSend(body, imagePath);
      if (!imagePath || body) setText("");
    } catch (e) {
      toastError(e);
    } finally {
      setSending(false);
      taRef.current?.focus();
    }
  }

  const canSend = !sending && !!text.trim();
  return (
    <form
      className="safe-bottom border-t border-border/70 bg-surface px-3 pt-2.5 pb-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setSending(true);
          try {
            const up = await uploadFile(roomId, "chat", file);
            await onSend(text.trim(), up.path);
            setText("");
          } catch (err) {
            toastError(err);
          } finally {
            setSending(false);
          }
        }}
      />
      <div className="flex items-end gap-0.5 rounded-[22px] border border-border-strong bg-background p-1 transition-[border-color,box-shadow] focus-within:border-primary focus-within:bg-surface focus-within:ring-4 focus-within:ring-primary/15">
        <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0 rounded-full" aria-label="이미지 보내기" disabled={sending} onClick={() => fileRef.current?.click()}>
          <ImagePlus aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="코드 블록 넣기"
          className="hidden size-9 shrink-0 rounded-full sm:inline-flex"
          onClick={() => {
            setText((t) => `${t}${t && !t.endsWith("\n") ? "\n" : ""}\`\`\`\n\n\`\`\``);
            taRef.current?.focus();
          }}
        >
          <Code2 aria-hidden />
        </Button>
        <Textarea
          ref={taRef}
          rows={1}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="메시지를 입력해요"
          title="Enter로 보내고, Shift+Enter로 줄을 바꿔요"
          aria-label="메시지 입력"
          className="max-h-36 min-h-9 flex-1 resize-none rounded-none border-0 bg-transparent px-1.5 py-2 text-base leading-snug shadow-none hover:border-0 focus-visible:ring-0"
        />
        <motion.div animate={{ scale: canSend ? 1 : 0.88, opacity: canSend ? 1 : 0.55 }} transition={spring} className="shrink-0">
          <Button type="submit" size="icon" className="size-9 rounded-full" aria-label="보내기" disabled={!canSend}>
            {sending ? <Loader2 className="animate-spin" aria-hidden /> : <SendHorizontal aria-hidden />}
          </Button>
        </motion.div>
      </div>
      {text.length > 1800 && <p className="mt-1 px-3 text-right text-xs text-muted-foreground tabular-nums">{text.length.toLocaleString("ko-KR")} / 2,000자</p>}
    </form>
  );
}
