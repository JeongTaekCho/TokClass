import { must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { broadcast } from "@/lib/realtime/server";
import { withUniqueJoinCode } from "@/lib/rooms/join-code";
import { toPublicRoom } from "@/lib/rooms/public";
import { normalizeSettings } from "@/lib/rooms/templates";
import { removeRoomFiles } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import type { Me, RoomRow } from "@/lib/types";
import { roomSettingsPatchSchema } from "@/lib/validation/room";

/** 방 정보 + 내 정보 */
export const GET = roomHandler({}, async ({ actor }) => {
  const me: Me =
    actor.kind === "instructor"
      ? { kind: "instructor", id: actor.userId, nickname: "강사" }
      : { kind: "participant", id: actor.participant.id, nickname: actor.participant.nickname, groupId: actor.participant.group_id };
  return { room: toPublicRoom(actor.room), me };
});

export const PATCH = roomHandler({ roles: ["instructor"], body: roomSettingsPatchSchema }, async ({ actor, body, roomId }) => {
  const settings = normalizeSettings(actor.room.settings);
  if (body.tabs) settings.tabs = body.tabs;
  if (body.defaultTab) settings.defaultTab = body.defaultTab;
  if (body.qaRevealAuthor !== undefined) settings.qaRevealAuthor = body.qaRevealAuthor;
  if (body.redThreshold !== undefined) settings.redThreshold = body.redThreshold;
  if (body.aiDailyLimit !== undefined) settings.aiDailyLimit = body.aiDailyLimit;
  if (body.sections) settings.sections = [...new Set(body.sections)];

  const update: Partial<RoomRow> = { settings: normalizeSettings(settings) };
  if (body.title !== undefined) update.title = body.title;
  if (body.capacity !== undefined) update.capacity = body.capacity;
  if (body.locked !== undefined) update.locked = body.locked;
  if (body.focusMode !== undefined) update.focus_mode = body.focusMode;
  if (body.startsAt !== undefined) {
    if (body.startsAt) {
      const d = new Date(body.startsAt);
      if (Number.isNaN(d.getTime())) throw new ApiError(400, "수업 일시를 확인해 주세요.");
      update.starts_at = d.toISOString();
    } else update.starts_at = null;
  }

  let updated: RoomRow;
  if (body.status === "active" && actor.room.status === "ended") {
    // 다시 열 때는 진행 중인 방과 겹치지 않는 코드가 필요할 수 있어요.
    updated = await withUniqueJoinCode<RoomRow>(async (code) => {
      const { data: clash } = await db().from("rooms").select("id").eq("join_code", actor.room.join_code).eq("status", "active").maybeSingle();
      const joinCode = clash ? code : actor.room.join_code;
      const { data, error } = await db().from("rooms").update({ ...update, status: "active", join_code: joinCode }).eq("id", roomId).select("*").single();
      if (error?.code === "23505") return { ok: false };
      if (error) throw error;
      return { ok: true, value: data as RoomRow };
    });
  } else {
    if (body.status) (update as Partial<RoomRow>).status = body.status;
    updated = must(await db().from("rooms").update(update).eq("id", roomId).select("*").single()) as RoomRow;
  }
  const room = toPublicRoom(updated);
  await broadcast(roomId, "room.updated", { room });
  return { room };
});

export const DELETE = roomHandler({ roles: ["instructor"] }, async ({ roomId }) => {
  await removeRoomFiles(roomId);
  must(await db().from("rooms").delete().eq("id", roomId));
  return { ok: true };
});
