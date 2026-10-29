import "server-only";

import { serverEnv } from "@/lib/env";
import { roomTopic, type RoomEventName, type RoomEvents } from "@/lib/realtime/events";

/**
 * Supabase Realtime HTTP Broadcast API로 방 채널(private)에 이벤트를 보내요.
 * 서버리스에서 WebSocket을 열지 않기 위해 HTTP로만 보냅니다. 실패해도 요청 자체는 성공시키고 로그만 남겨요.
 */
export async function broadcast<E extends RoomEventName>(roomId: string, event: E, payload: RoomEvents[E]) {
  await broadcastMany(roomId, [{ event, payload }]);
}

export async function broadcastMany(roomId: string, items: { event: RoomEventName; payload: unknown }[]) {
  if (items.length === 0) return;
  const key = serverEnv.serviceRoleKey;
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  // 레거시 JWT 형식 키면 Authorization 헤더도 함께 보내요 (sb_secret_ 형식은 apikey만).
  if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`;
  try {
    const res = await fetch(`${serverEnv.supabaseUrl}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: items.map((i) => ({ topic: roomTopic(roomId), event: i.event, payload: i.payload, private: true })),
      }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[realtime] broadcast 실패", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("[realtime] broadcast 오류", e);
  }
}
