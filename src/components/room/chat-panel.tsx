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

/** 서버 응답 전에 먼저 띄운 메시지 id 접두사 */
const PENDING_PREFIX = "pending-";

const RUN_GAP = 3 * 60_000;
const authorKey = (m: ChatMessage) => (m.author.kind === "instructor" ? INSTRUCTOR_REACTOR : (m.author.id ?? m.author.nickname));

/** 같은 사람이 3분 안에 이어 보낸 메시지는 한 묶음으로 보여요 (이름·아바타는 처음, 시간은 마지막에만). */
function sameRun(a: ChatMessage | undefined, b: ChatMessage | undefined) {
  return !!a && !!b && authorKey(a) === authorKey(b) && formatDay(a.createdAt) === formatDay(b.createdAt) && Date.parse(b.createdAt) - Date.parse(a.createdAt) < RUN_GAP;
}

export function ChatPanel({ groupId = null, readOnly = false, className }: { groupId?: string | null; readOnly?: boolean; className?: string }) {
  const { roomId, me, room } = useRoom();
  const key = `/api/rooms/${roomId}/messages${groupId ? `?group=${groupId}` : ""}`;
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);
  const [live, setLive] = useState<ChatMessage[]>([]);
  const [hiddenOverride, setHiddenOverride] = useState<Record<string, boolean>>({});
  const [reactionOverride, setReactionOverride] = useState<Record<string, MessageReaction[]>>({});
  // 실시간 반응 이벤트를 받은 횟수(메시지별). 내 요청 응답이 그보다 늦게 오면 낡은 값이라 버려요.
  const reactionSeq = useRef<Record<string, number>>({});
  const { data, isLoading } = useSWR<Page>(key, fetcher, {
    revalidateOnFocus: false,
    // 다시 받아 온(재연결 포함) 서버 값이 실시간으로 덧씌운 값보다 최신이에요.
    onSuccess: (page) => {
      const ids = new Set(page.messages.map((m) => m.id));
      const omit = <T,>(prev: Record<string, T>) => Object.fromEntries(Object.entries(prev).filter(([id]) => !ids.has(id)));
      setHiddenOverride(omit);
      setReactionOverride(omit);
      setLive((prev) => prev.filter((m) => !ids.has(m.id)));
    },
  });
  const [newCount, setNewCount] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const prevHeight = useRef<number | null>(null);

  const messages = useMemo(() => mergeMessages(older, data?.messages ?? [], live), [older, data, live]);
  const hasMore = olderHasMore ?? data?.hasMore ?? false;
  const isMine = (author: Pick<ChatMessage["author"], "kind" | "id">) => author.kind === me.kind && (author.id ?? me.id) === me.id;

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setNewCount(0);
  }, []);

  /** 메시지 1건을 서버에서 다시 받아 와 목록에 넣거나 바꿔요 (조 채팅 신호·숨김 해제·조 반응 변경). */
  async function refetchOne(id: string) {
    try {
      const { message } = await api<{ message: ChatMessage }>(`/api/rooms/${roomId}/messages/${id}`);
      const drop = <T,>(prev: Record<string, T>) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id));
      setHiddenOverride(drop);
      setReactionOverride(drop);
      setOlder((prev) => (prev.some((m) => m.id === id) ? prev.map((m) => (m.id === id ? message : m)) : prev));
      setLive((prev) => [...prev.filter((m) => m.id !== id), message]);
      return message;
    } catch {
      return null;
    }
  }

  function receive(message: ChatMessage) {
    setLive((prev) => {
      const rest = prev.filter((m) => m.id !== message.id);
      // 내가 먼저 띄워 둔 말풍선은 서버에서 온 진짜 메시지로 바꿔요.
      if (isMine(message.author)) {
        const i = rest.findIndex((m) => m.id.startsWith(PENDING_PREFIX) && m.body === message.body);
        if (i >= 0) rest.splice(i, 1);
      }
      return [...rest, message];
    });
    if (!nearBottom.current && !isMine(message.author)) setNewCount((n) => n + 1);
  }

  useRoomEvent("chat.message", ({ message }) => {
    if ((message.groupId ?? null) !== (groupId ?? null)) return;
    receive(message);
  });
  useRoomEvent("chat.group", ({ groupId: g, id, author }) => {
    if (g !== groupId || isMine(author)) return;
    void refetchOne(id).then((m) => m && !nearBottom.current && setNewCount((n) => n + 1));
  });
  useRoomEvent("chat.hidden", ({ id, hidden }) => {
    if (!messages.some((m) => m.id === id)) return;
    if (hidden) setHiddenOverride((prev) => ({ ...prev, [id]: true }));
    // 숨김을 풀면 본문을 받아 와야 해요 (숨긴 상태로 받은 메시지는 본문이 비어 있어요).
    else void refetchOne(id);
  });
  useRoomEvent("chat.reactions", ({ id, groupId: g, reactions }) => {
    if ((g ?? null) !== (groupId ?? null)) return;
    reactionSeq.current[id] = (reactionSeq.current[id] ?? 0) + 1;
    if (reactions) setReactionOverride((prev) => ({ ...prev, [id]: reactions }));
    else void refetchOne(id);
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
    const seq = reactionSeq.current[m.id] ?? 0;
    const stale = () => (reactionSeq.current[m.id] ?? 0) !== seq;
    setReactionOverride((prev) => ({ ...prev, [m.id]: toggleReaction(before, emoji, { key: myKey, name: me.kind === "instructor" ? "강사" : me.nickname }) }));
    try {
      const res = await api<{ reactions: MessageReaction[] }>(`/api/rooms/${roomId}/messages/${m.id}/reactions`, { body: { emoji } });
      if (!stale()) setReactionOverride((prev) => ({ ...prev, [m.id]: res.reactions }));
    } catch (e) {
      if (!stale()) setReactionOverride((prev) => ({ ...prev, [m.id]: before }));
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
        className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto px-3 pt-1 pb-4"
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
          const pending = m.id.startsWith(PENDING_PREFIX);
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
                pending={pending}
                canReact={!disabled && !locked && !pending}
                canModerate={me.kind === "instructor" && !pending}
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
            // 글만 보낼 때는 서버 응답을 기다리지 않고 말풍선을 바로 띄워요(낙관적 업데이트). 실패하면 지워요.
            const tempId = `${PENDING_PREFIX}${crypto.randomUUID()}`;
            nearBottom.current = true;
            if (!imagePath) {
              const author = me.kind === "instructor" ? { kind: "instructor" as const, id: null, nickname: "강사" } : { kind: "participant" as const, id: me.id, nickname: me.nickname };
              setLive((prev) => [...prev, { id: tempId, roomId, groupId, author, body, imageUrl: null, hidden: false, createdAt: new Date().toISOString(), reactions: [] }]);
            }
            try {
              const res = await api<{ message: ChatMessage }>(`/api/rooms/${roomId}/messages`, { body: { body, imagePath, groupId } });
              setLive((prev) => [...prev.filter((m) => m.id !== tempId && m.id !== res.message.id), res.message]);
            } catch (e) {
              setLive((prev) => prev.filter((m) => m.id !== tempId));
              throw e;
            }
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

  // 입력창은 바로 비우고 다음 메시지를 쓸 수 있게 해요. 보내지 못하면 쓴 글을 되돌려 놓아요.
  async function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    taRef.current?.focus();
    try {
      await onSend(body, null);
    } catch (e) {
      setText((t) => (t ? t : body));
      toastError(e);
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
