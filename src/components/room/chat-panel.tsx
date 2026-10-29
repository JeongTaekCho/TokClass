"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { ArrowDown, Code2, EyeOff, ImagePlus, Loader2, Lock, MoreHorizontal, Send } from "lucide-react";

import { LinkPreview } from "@/components/room/link-preview";
import { firstUrl, MessageBody } from "@/components/room/message-body";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { uploadFile } from "@/lib/client/upload";
import { formatTime } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

type Page = { messages: ChatMessage[]; hasMore: boolean };

function mergeMessages(...lists: ChatMessage[][]) {
  const map = new Map<string, ChatMessage>();
  for (const list of lists) for (const m of list) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function ChatPanel({ groupId = null, readOnly = false, className }: { groupId?: string | null; readOnly?: boolean; className?: string }) {
  const { roomId, me, room } = useRoom();
  const key = `/api/rooms/${roomId}/messages${groupId ? `?group=${groupId}` : ""}`;
  const { data, isLoading, mutate } = useSWR<Page>(key, fetcher, { revalidateOnFocus: false });
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);
  const [live, setLive] = useState<ChatMessage[]>([]);
  const [hiddenOverride, setHiddenOverride] = useState<Record<string, boolean>>({});
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

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        ref={scrollRef}
        className="scrollbar-thin relative min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
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
        {!hasMore && messages.length > 0 && <p className="py-2 text-center text-xs text-muted-foreground">대화의 처음이에요</p>}
        {isLoading && <Loader2 className="mx-auto mt-8 size-6 animate-spin text-muted-foreground" aria-label="불러오는 중" />}
        {!isLoading && messages.length === 0 && <p className="mt-10 text-center text-muted-foreground">첫 메시지를 남겨 보세요 👋</p>}
        {messages.map((m) => (
          <MessageItem key={m.id} m={m} hidden={hiddenOverride[m.id] ?? m.hidden} mine={m.author.kind === me.kind && (m.author.id ?? me.id) === me.id} canModerate={me.kind === "instructor"} roomId={roomId} />
        ))}
      </div>
      {newCount > 0 && (
        <div className="pointer-events-none relative">
          <Button size="sm" className="pointer-events-auto absolute -top-12 left-1/2 -translate-x-1/2 rounded-full shadow-lifted" onClick={() => scrollToBottom(true)}>
            <ArrowDown aria-hidden /> 새 메시지 {newCount}개
          </Button>
        </div>
      )}
      {!disabled && (locked ? (
        <p className="flex items-center justify-center gap-2 border-t border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
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

function MessageItem({ m, hidden, mine, canModerate, roomId }: { m: ChatMessage; hidden: boolean; mine: boolean; canModerate: boolean; roomId: string }) {
  const url = !hidden ? firstUrl(m.body) : null;
  const isInstructor = m.author.kind === "instructor";
  return (
    <div className={cn("group flex flex-col", mine ? "items-end" : "items-start")}>
      <div className="mb-0.5 flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <span className={cn("font-semibold", isInstructor ? "text-coral" : "text-foreground")}>{isInstructor ? "👩‍🏫 강사" : m.author.nickname}</span>
        <time dateTime={m.createdAt}>{formatTime(m.createdAt)}</time>
        {canModerate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md opacity-60 hover:bg-muted hover:opacity-100" aria-label="메시지 관리">
                <MoreHorizontal className="size-4" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={mine ? "end" : "start"}>
              <DropdownMenuItem
                onSelect={async () => {
                  try {
                    await api(`/api/rooms/${roomId}/messages/${m.id}`, { method: "PATCH", body: { hidden: !hidden } });
                  } catch (e) {
                    toastError(e);
                  }
                }}
              >
                <EyeOff aria-hidden /> {hidden ? "다시 보이기" : "숨기기"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2",
          hidden ? "border border-dashed border-border bg-muted text-muted-foreground" : mine ? "bg-primary text-primary-foreground" : isInstructor ? "bg-coral-soft text-foreground" : "bg-card text-foreground shadow-soft",
        )}
      >
        {hidden && !canModerate ? (
          <p className="text-sm italic">강사가 숨긴 메시지예요.</p>
        ) : (
          <>
            {hidden && <p className="mb-1 text-xs font-semibold">숨김 처리됨 (수강생에게 안 보여요)</p>}
            {m.imageUrl && (
              <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                <img src={m.imageUrl} alt={`${m.author.nickname}님이 올린 이미지`} className="my-1 max-h-72 rounded-xl object-contain" loading="lazy" />
              </a>
            )}
            {m.body && <MessageBody text={m.body} className={mine && !hidden ? "[&_a]:text-white" : undefined} />}
          </>
        )}
      </div>
      {url && <LinkPreview url={url} />}
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

  return (
    <form
      className="safe-bottom flex items-end gap-1.5 border-t border-border bg-card p-2"
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
      <Button type="button" variant="ghost" size="icon" aria-label="이미지 보내기" disabled={sending} onClick={() => fileRef.current?.click()}>
        <ImagePlus aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="코드 블록 넣기"
        className="hidden sm:inline-flex"
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
        placeholder="메시지를 입력해요 (Shift+Enter 줄바꿈)"
        aria-label="메시지 입력"
        className="max-h-36 min-h-11 flex-1 resize-none py-2.5"
      />
      <Button type="submit" size="icon" aria-label="보내기" disabled={sending || !text.trim()}>
        {sending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
      </Button>
    </form>
  );
}
