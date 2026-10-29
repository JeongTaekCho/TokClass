import { must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { listMaterials } from "@/lib/data/materials";
import { broadcast } from "@/lib/realtime/server";
import { toPublicRoom } from "@/lib/rooms/public";
import { assertRoomPath } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import type { RoomRow } from "@/lib/types";
import { materialCreateSchema } from "@/lib/validation/slides";

export const GET = roomHandler({ allowEnded: true }, async ({ roomId }) => ({ materials: await listMaterials(roomId) }));

export const POST = roomHandler({ roles: ["instructor"], body: materialCreateSchema, allowEnded: true }, async ({ roomId, body, actor }) => {
  try {
    assertRoomPath(roomId, body.path, "material");
  } catch {
    throw new ApiError(400, "교안 파일을 다시 올려 주세요.");
  }
  const { count } = await db().from("materials").select("id", { count: "exact", head: true }).eq("room_id", roomId);
  const row = must(
    await db()
      .from("materials")
      .insert({ room_id: roomId, title: body.title, storage_path: body.path, page_count: body.pageCount, size_bytes: body.sizeBytes, position: count ?? 0 })
      .select("id")
      .single(),
  ) as { id: string };
  // 첫 교안이면 바로 진행 교안으로
  if (!actor.room.current_material_id) {
    const room = must(await db().from("rooms").update({ current_material_id: row.id, current_page: 1 }).eq("id", roomId).select("*").single()) as RoomRow;
    await broadcast(roomId, "room.updated", { room: toPublicRoom(room) });
  }
  await broadcast(roomId, "material.changed", {});
  return { id: row.id, materials: await listMaterials(roomId) };
});
