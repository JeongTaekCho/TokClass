"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { roomTopic, type RoomEventName } from "@/lib/realtime/events";
import type { PresenceMember } from "@/lib/realtime/provider";
import { getInstructorSupabase } from "@/lib/supabase/browser";

/**
 * 강사가 여러 방의 접속자를 한 번에 보기 위한 훅 (수강생 관리 화면).
 * 각 방 채널을 구독만 하고 track()은 하지 않아서, 수강생 화면에 강사가 접속한 것으로 보이지 않아요.
 * 방 채널 구독 권한은 기존 Realtime RLS(방 주인)로 확인돼요.
 */
export function useRoomsPresence(roomIds: string[], onEvent?: (event: RoomEventName, roomId: string) => void) {
  const [online, setOnline] = useState<Set<string>>(new Set());
  const cb = useRef(onEvent);
  useEffect(() => {
    cb.current = onEvent;
  });
  const key = [...roomIds].sort().join(",");

  useEffect(() => {
    if (!key) return;
    const ids = key.split(",");
    const client = getInstructorSupabase();
    const channels: RealtimeChannel[] = [];
    const perRoom = new Map<string, Set<string>>();
    let disposed = false;
    const publish = () => {
      const all = new Set<string>();
      perRoom.forEach((s) => s.forEach((id) => all.add(id)));
      setOnline(all);
    };

    (async () => {
      const { data } = await client.auth.getSession();
      if (data.session) await client.realtime.setAuth(data.session.access_token);
      if (disposed) return;
      for (const roomId of ids) {
        const ch = client.channel(roomTopic(roomId), { config: { private: true, broadcast: { self: false } } });
        ch.on("presence", { event: "sync" }, () => {
          const set = new Set<string>();
          for (const metas of Object.values(ch.presenceState<PresenceMember>())) {
            const m = metas[0];
            if (m?.kind === "participant") set.add(m.id);
          }
          perRoom.set(roomId, set);
          publish();
        });
        ch.on("broadcast", { event: "*" }, (msg: { event: string }) => cb.current?.(msg.event as RoomEventName, roomId));
        ch.subscribe((s, err) => {
          if (err) console.warn("[realtime] 접속 현황 채널", s, err.message);
        });
        channels.push(ch);
      }
    })().catch((e) => console.error("[realtime] 접속 현황 연결 실패", e));

    return () => {
      disposed = true;
      channels.forEach((ch) => void client.removeChannel(ch));
      setOnline(new Set());
    };
  }, [key]);

  return online;
}
