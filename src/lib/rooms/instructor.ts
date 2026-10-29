import "server-only";

import { notFound, redirect } from "next/navigation";

import { loadRoom } from "@/lib/auth/actor";
import { normalizeSettings } from "@/lib/rooms/templates";
import { getInstructor } from "@/lib/supabase/server";

/** 강사 페이지용: 로그인 + 방 주인 확인 */
export async function requireOwnedRoom(roomId: string) {
  const user = await getInstructor();
  if (!user) redirect(`/login?next=/rooms/${roomId}/live`);
  if (!/^[0-9a-f-]{36}$/i.test(roomId)) notFound();
  const room = await loadRoom(roomId);
  if (!room || room.owner_id !== user.id) notFound();
  return { user, room, settings: normalizeSettings(room.settings) };
}
