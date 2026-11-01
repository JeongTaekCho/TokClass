import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { loadRoom } from "@/lib/auth/actor";
import { normalizeSettings } from "@/lib/rooms/templates";
import { requireApprovedInstructor } from "@/lib/supabase/server";

/**
 * 강사 페이지용: 로그인 + 승인 + 방 주인 확인.
 * 레이아웃과 페이지가 같은 요청에서 함께 부르니 cache로 한 번만 조회하고, 강사 확인과 방 조회는 동시에 해요.
 */
export const requireOwnedRoom = cache(async (roomId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(roomId)) notFound();
  const [access, room] = await Promise.all([requireApprovedInstructor(`/rooms/${roomId}/live`), loadRoom(roomId)]);
  const { user } = access;
  if (!room || room.owner_id !== user.id) notFound();
  return { user, access, room, settings: normalizeSettings(room.settings) };
});
