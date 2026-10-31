import { adminHandler, isUuid, must } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { loadRoom } from "@/lib/auth/actor";
import { writeAudit } from "@/lib/admin/server";
import { broadcast } from "@/lib/realtime/server";
import { toPublicRoom } from "@/lib/rooms/public";
import { removeRoomFiles } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import type { RoomRow } from "@/lib/types";
import { adminRoomActionSchema, adminRoomDeleteSchema } from "@/lib/validation/admin";

async function findRoom(roomId: string | undefined) {
  if (!isUuid(roomId)) throw notFound("방을 찾을 수 없어요.");
  const room = await loadRoom(roomId);
  if (!room) throw notFound("방을 찾을 수 없어요.");
  return room;
}

/** 강제 종료 (관리자): 수강생 화면에도 바로 종료가 반영돼요. */
export const POST = adminHandler({ body: adminRoomActionSchema }, async ({ params, access }) => {
  const room = await findRoom(params.roomId);
  if (room.status === "ended") throw new ApiError(409, "이미 종료된 방이에요.");
  const updated = must(await db().from("rooms").update({ status: "ended" }).eq("id", room.id).select("*").single()) as RoomRow;
  await broadcast(room.id, "room.updated", { room: toPublicRoom(updated) });
  await writeAudit(access, { action: "room.end", targetType: "room", targetId: room.id, targetLabel: room.title, meta: { ownerId: room.owner_id, joinCode: room.join_code } });
  return { ok: true };
});

/** 삭제 (관리자): 방 제목을 그대로 입력해야 지워져요. */
export const DELETE = adminHandler({ body: adminRoomDeleteSchema }, async ({ params, body, access }) => {
  const room = await findRoom(params.roomId);
  if (body.confirmTitle.trim() !== room.title.trim()) throw new ApiError(400, "방 제목이 일치하지 않아요.", "confirm_mismatch");
  const { count } = await db().from("participants").select("id", { count: "exact", head: true }).eq("room_id", room.id);
  await removeRoomFiles(room.id);
  must(await db().from("rooms").delete().eq("id", room.id));
  await writeAudit(access, {
    action: "room.delete",
    targetType: "room",
    targetId: room.id,
    targetLabel: room.title,
    meta: { ownerId: room.owner_id, joinCode: room.join_code, participants: count ?? 0, createdAt: room.created_at },
  });
  return { ok: true };
});
