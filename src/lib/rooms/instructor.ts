import "server-only";

import { notFound } from "next/navigation";

import { loadRoom } from "@/lib/auth/actor";
import { normalizeSettings } from "@/lib/rooms/templates";
import { requireApprovedInstructor } from "@/lib/supabase/server";

/** 강사 페이지용: 로그인 + 승인 + 방 주인 확인 */
export async function requireOwnedRoom(roomId: string) {
  const access = await requireApprovedInstructor(`/rooms/${roomId}/live`);
  const { user } = access;
  if (!/^[0-9a-f-]{36}$/i.test(roomId)) notFound();
  const room = await loadRoom(roomId);
  if (!room || room.owner_id !== user.id) notFound();
  return { user, access, room, settings: normalizeSettings(room.settings) };
}
