"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { useSWRConfig } from "swr";

import { api, ClientApiError } from "@/lib/client/api";
import { roomTopic, type RoomEventName, type RoomEvents } from "@/lib/realtime/events";
import { createParticipantSupabase, getInstructorSupabase } from "@/lib/supabase/browser";
import type { Me, PublicRoom } from "@/lib/types";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting";
export type PresenceMember = { id: string; kind: "instructor" | "participant"; nickname: string };
type Handler<E extends RoomEventName> = (payload: RoomEvents[E]) => void;
export type SessionLostReason = "kicked" | "replaced" | "reissued" | "expired";

type Ctx = {
  roomId: string;
  room: PublicRoom;
  setRoom: React.Dispatch<React.SetStateAction<PublicRoom>>;
  me: Me;
  status: ConnectionStatus;
  online: Map<string, PresenceMember>;
  sessionLost: SessionLostReason | null;
  on: <E extends RoomEventName>(event: E, handler: Handler<E>) => () => void;
  /** 강사만: 클라이언트에서 바로 broadcast (페이지 넘김처럼 잦은 이벤트) */
  send: <E extends RoomEventName>(event: E, payload: RoomEvents[E]) => void;
  /** 재연결 후 데이터를 다시 받아오기 */
  resync: () => void;
};

const RoomContext = createContext<Ctx | null>(null);

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom은 RoomProvider 안에서만 쓸 수 있어요.");
  return ctx;
}

/** 이벤트 구독 훅 (핸들러가 바뀌어도 재구독하지 않아요) */
export function useRoomEvent<E extends RoomEventName>(event: E, handler: Handler<E>) {
  const { on } = useRoom();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => on(event, (p) => ref.current(p)), [on, event]);
}

/**
 * 방 하나당 Realtime 채널 하나. 이 Provider 하나만 연결을 만들고,
 * 모든 탭·컴포넌트는 on()으로 이벤트 타입별 구독만 해요.
 */
export function RoomProvider({ initialRoom, me, children }: { initialRoom: PublicRoom; me: Me; children: React.ReactNode }) {
  const roomId = initialRoom.id;
  const [room, setRoom] = useState(initialRoom);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [online, setOnline] = useState<Map<string, PresenceMember>>(new Map());
  const [sessionLost, setSessionLost] = useState<SessionLostReason | null>(null);
  const handlers = useRef(new Map<string, Set<(p: unknown) => void>>());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { mutate } = useSWRConfig();

  const resync = useCallback(() => {
    const prefix = `/api/rooms/${roomId}`;
    void mutate((key) => typeof key === "string" && key.startsWith(prefix));
    api<{ room: PublicRoom }>(`/api/rooms/${roomId}`)
      .then((r) => setRoom(r.room))
      .catch((e) => {
        if (e instanceof ClientApiError && e.status === 401) setSessionLost("expired");
      });
  }, [mutate, roomId]);

  const emit = useCallback((event: string, payload: unknown) => {
    handlers.current.get(event)?.forEach((h) => {
      try {
        h(payload);
      } catch (e) {
        console.error("[realtime] 핸들러 오류", event, e);
      }
    });
  }, []);

  const on = useCallback(<E extends RoomEventName>(event: E, handler: Handler<E>) => {
    const set = handlers.current.get(event) ?? new Set();
    set.add(handler as (p: unknown) => void);
    handlers.current.set(event, set);
    return () => {
      set.delete(handler as (p: unknown) => void);
    };
  }, []);

  const send = useCallback(<E extends RoomEventName>(event: E, payload: RoomEvents[E]) => {
    const ch = channelRef.current;
    if (!ch) return;
    void ch.send({ type: "broadcast", event, payload });
  }, []);

  useEffect(() => {
    let disposed = false;
    let client: SupabaseClient;
    let tokenCache: { token: string; expiresAt: number } | null = null;

    if (me.kind === "instructor") {
      client = getInstructorSupabase();
    } else {
      client = createParticipantSupabase(async () => {
        if (tokenCache && tokenCache.expiresAt - Date.now() > 60_000) return tokenCache.token;
        try {
          tokenCache = await api<{ token: string; expiresAt: number }>(`/api/rooms/${roomId}/realtime-token`);
          return tokenCache.token;
        } catch (e) {
          if (e instanceof ClientApiError && (e.status === 401 || e.status === 403)) {
            if (!disposed) setSessionLost((prev) => prev ?? "expired");
          }
          throw e;
        }
      });
    }

    let hadDisconnect = false;
    const start = async () => {
      if (me.kind === "instructor") {
        const { data } = await client.auth.getSession();
        if (data.session) await client.realtime.setAuth(data.session.access_token);
      } else {
        // accessToken 콜백 적용 전에 join하면 anon 키로 구독을 시도해서 거부돼요. 먼저 토큰을 설정합니다.
        await client.realtime.setAuth();
      }
      if (disposed) return;
      const channel = client.channel(roomTopic(roomId), {
        config: { private: true, broadcast: { self: false }, presence: { key: me.id } },
      });
      channelRef.current = channel;
      channel.on("broadcast", { event: "*" }, (msg: { event: string; payload: unknown }) => {
        if (msg.event === "room.updated") setRoom((msg.payload as RoomEvents["room.updated"]).room);
        if (msg.event === "slide.page") {
          const p = msg.payload as RoomEvents["slide.page"];
          setRoom((r) => ({ ...r, currentMaterialId: p.materialId, currentPage: p.page }));
        }
        if (msg.event === "participant.session" && me.kind === "participant") {
          const p = msg.payload as RoomEvents["participant.session"];
          if (p.participantId === me.id) {
            // 같은 브라우저에서 다시 로그인한 경우엔 쿠키가 새 세션이라 그대로 유지돼요.
            api(`/api/rooms/${roomId}`).catch((e) => {
              if (e instanceof ClientApiError && e.status === 401) setSessionLost(p.reason);
            });
          }
        }
        emit(msg.event, msg.payload);
      });
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMember>();
        const map = new Map<string, PresenceMember>();
        for (const [key, metas] of Object.entries(state)) {
          const m = metas[0];
          if (m) map.set(key, { id: m.id, kind: m.kind, nickname: m.nickname });
        }
        setOnline(map);
      });
      channel.subscribe(async (s, err) => {
        if (disposed) return;
        if (s === "SUBSCRIBED") {
          setStatus("connected");
          await channel.track({ id: me.id, kind: me.kind, nickname: me.nickname });
          if (hadDisconnect) resync();
          hadDisconnect = false;
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          if (err) console.warn("[realtime] 채널 상태", s, err.message);
          hadDisconnect = true;
          setStatus("reconnecting");
        }
      });
    };
    start().catch((e) => console.error("[realtime] 연결 실패", e));

    // 다시 온라인이 되거나 탭이 다시 보이면 놓친 데이터를 받아와요.
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 20_000) resync();
    };
    const onOnline = () => resync();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch) void client.removeChannel(ch);
      if (me.kind === "participant") void client.realtime.disconnect();
    };
  }, [roomId, me.id, me.kind, me.nickname, emit, resync]);

  // 세션이 끊기면 연결도 정리
  useEffect(() => {
    if (sessionLost && channelRef.current) {
      void channelRef.current.unsubscribe();
    }
  }, [sessionLost]);

  const value = useMemo<Ctx>(
    () => ({ roomId, room, setRoom, me, status, online, sessionLost, on, send, resync }),
    [roomId, room, me, status, online, sessionLost, on, send, resync],
  );
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
