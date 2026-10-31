import "server-only";

import { ApiError, notFound } from "@/lib/api/errors";
import { must } from "@/lib/api/handler";
import { generatePassword, hmacPassword } from "@/lib/auth/password";
import { serverEnv } from "@/lib/env";
import { broadcast, broadcastMany } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";

export type ManagedParticipant = { id: string; room_id: string; nickname: string; session_version: number; kicked: boolean };

const SELECT = "id, room_id, nickname, session_version, kicked";

export async function loadRoomParticipant(roomId: string, pid: string): Promise<ManagedParticipant> {
  const p = must(await db().from("participants").select(SELECT).eq("id", pid).eq("room_id", roomId).maybeSingle()) as ManagedParticipant | null;
  if (!p) throw notFound("참여자를 찾을 수 없어요.");
  return p;
}

/** 강사 본인 소유 방 id 목록 */
export async function ownedRoomIds(ownerId: string): Promise<string[]> {
  const rows = must(await db().from("rooms").select("id").eq("owner_id", ownerId)) as { id: string }[];
  return rows.map((r) => r.id);
}

/** 강사 본인 방의 참여자들만 (owner_id 확인). 다른 강사 방의 id는 조용히 빠져요. */
export async function loadOwnedParticipants(ownerId: string, ids: string[]): Promise<ManagedParticipant[]> {
  if (ids.length === 0) return [];
  const roomIds = await ownedRoomIds(ownerId);
  if (roomIds.length === 0) return [];
  return must(await db().from("participants").select(SELECT).in("id", ids).in("room_id", roomIds)) as ManagedParticipant[];
}

/** 새 비밀번호 발급 → 기존 비밀번호·세션 즉시 무효. 원문은 이 응답에서 한 번만 돌려줘요. */
export async function reissuePassword(p: ManagedParticipant) {
  for (let i = 0; i < 8; i++) {
    const password = generatePassword();
    const { error } = await db()
      .from("participants")
      .update({ password_hmac: hmacPassword(serverEnv.passwordSecret, p.room_id, password), session_version: p.session_version + 1 })
      .eq("id", p.id);
    if (error?.code === "23505") continue;
    if (error) throw error;
    await broadcast(p.room_id, "participant.session", { participantId: p.id, reason: "reissued" });
    return password;
  }
  throw new ApiError(500, "비밀번호를 만들지 못했어요. 다시 시도해 주세요.");
}

/** 강퇴: 세션 무효 + 조 해제 + 이해도·열린 도움 요청 정리. 남긴 기록은 유지해요. */
export async function kickParticipants(list: ManagedParticipant[]) {
  const targets = list.filter((p) => !p.kicked);
  if (targets.length === 0) return 0;
  const d = db();
  for (const p of targets) {
    must(await d.from("participants").update({ kicked: true, session_version: p.session_version + 1, group_id: null }).eq("id", p.id));
  }
  const ids = targets.map((p) => p.id);
  await d.from("understanding_current").delete().in("participant_id", ids);
  await d.from("help_requests").update({ status: "resolved", resolved_at: new Date().toISOString() }).in("participant_id", ids).eq("status", "open");
  await broadcastByRoom(targets, "kicked");
  return targets.length;
}

/** 강제 로그아웃: session_version만 올려요. 비밀번호는 그대로라 다시 들어올 수 있어요. */
export async function logoutParticipants(list: ManagedParticipant[]) {
  const targets = list.filter((p) => !p.kicked);
  for (const p of targets) {
    must(await db().from("participants").update({ session_version: p.session_version + 1 }).eq("id", p.id));
  }
  await broadcastByRoom(targets, "signed_out");
  return targets.length;
}

export async function restoreParticipant(p: ManagedParticipant) {
  must(await db().from("participants").update({ kicked: false }).eq("id", p.id));
}

export async function moveParticipantGroup(p: ManagedParticipant, groupId: string | null) {
  if (groupId) {
    const g = must(await db().from("groups").select("id").eq("id", groupId).eq("room_id", p.room_id).maybeSingle());
    if (!g) throw new ApiError(404, "조를 찾을 수 없어요.");
  }
  must(await db().from("participants").update({ group_id: groupId }).eq("id", p.id));
  await broadcast(p.room_id, "group.changed", {});
}

/** 닉네임 변경: 같은 방 안에서 대소문자 구분 없이 겹치면 안 돼요. */
export async function renameParticipant(p: ManagedParticipant, nickname: string) {
  if (nickname === p.nickname) return;
  const { data: taken } = await db()
    .from("participants")
    .select("id")
    .eq("room_id", p.room_id)
    .neq("id", p.id)
    .ilike("nickname", nickname.replace(/[%_\\]/g, "\\$&"))
    .maybeSingle();
  if (taken) throw new ApiError(409, "이미 이 방에서 쓰고 있는 닉네임이에요.", "nickname_taken");
  const { error } = await db().from("participants").update({ nickname }).eq("id", p.id);
  if (error?.code === "23505") throw new ApiError(409, "이미 이 방에서 쓰고 있는 닉네임이에요.", "nickname_taken");
  if (error) throw error;
  await broadcast(p.room_id, "participant.joined", { participantId: p.id });
}

async function broadcastByRoom(list: ManagedParticipant[], reason: "kicked" | "signed_out") {
  const byRoom = new Map<string, ManagedParticipant[]>();
  for (const p of list) byRoom.set(p.room_id, [...(byRoom.get(p.room_id) ?? []), p]);
  await Promise.all(
    [...byRoom].map(([roomId, ps]) =>
      broadcastMany(
        roomId,
        ps.map((p) => ({ event: "participant.session" as const, payload: { participantId: p.id, reason } })),
      ),
    ),
  );
}
