import "server-only";

import { readParticipantSession } from "@/lib/auth/participant-session";
import { db } from "@/lib/supabase/admin";
import type { RoomRow } from "@/lib/types";

/**
 * 참여코드로 방 찾기. 진행 중인 방끼리만 코드가 유일해서, 종료된 방은 같은 코드가 여러 개일 수 있어요.
 * 1) 이 브라우저에 세션이 있는 방 → 2) 진행 중인 방 → 3) (allowEnded) 가장 최근에 끝난 방
 */
export async function findRoomByCode(code: string, opts: { allowEnded?: boolean } = {}): Promise<RoomRow | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const { data, error } = await db().from("rooms").select("*").eq("join_code", code).order("created_at", { ascending: false }).limit(10);
  if (error) throw error;
  const rooms = (data ?? []) as RoomRow[];
  for (const r of rooms) {
    if (await readParticipantSession(r.id)) return r;
  }
  const active = rooms.find((r) => r.status === "active");
  if (active) return active;
  return opts.allowEnded ? (rooms[0] ?? null) : null;
}
