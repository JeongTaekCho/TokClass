import "server-only";

import type { Actor } from "@/lib/auth/actor";
import { ApiError, notFound } from "@/lib/api/errors";
import { db } from "@/lib/supabase/admin";

/**
 * 채팅·산출물에서 쓸 조(group) 범위를 정해요.
 * - 수강생: 조 모드가 켜져 있고 본인 조가 있으면 본인 조만, 아니면 전체(null)
 * - 강사: 요청한 조(없으면 전체)
 */
export function resolveGroupScope(actor: Actor, requested: string | null | undefined): string | null {
  if (actor.kind === "instructor") return requested ?? null;
  if (!requested) return null;
  if (!actor.settings.groups.active || actor.participant.group_id !== requested) {
    throw new ApiError(403, "우리 조 채널만 볼 수 있어요.");
  }
  return requested;
}

/** 강사가 넘긴 조 id가 이 방의 조인지 확인해요 (다른 방 조로 글을 넣지 못하게). */
export async function assertGroupInRoom(roomId: string, groupId: string | null) {
  if (!groupId) return;
  const { data } = await db().from("groups").select("id").eq("id", groupId).eq("room_id", roomId).maybeSingle();
  if (!data) throw notFound("조를 찾을 수 없어요.");
}
