import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { listMaterials } from "@/lib/data/materials";
import { broadcast } from "@/lib/realtime/server";
import { BUCKETS, removeFiles } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import { materialPatchSchema } from "@/lib/validation/slides";

export const PATCH = roomHandler({ roles: ["instructor"], body: materialPatchSchema, allowEnded: true }, async ({ roomId, params, body }) => {
  if (!isUuid(params.id)) throw notFound();
  must(await db().from("materials").update({ title: body.title }).eq("id", params.id).eq("room_id", roomId));
  await broadcast(roomId, "material.changed", {});
  return { materials: await listMaterials(roomId) };
});

export const DELETE = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId, params }) => {
  if (!isUuid(params.id)) throw notFound();
  const row = must(await db().from("materials").select("storage_path").eq("id", params.id).eq("room_id", roomId).maybeSingle()) as { storage_path: string } | null;
  if (!row) throw notFound("교안을 찾을 수 없어요.");
  must(await db().from("materials").delete().eq("id", params.id));
  await removeFiles(BUCKETS.materials, [row.storage_path]);
  await broadcast(roomId, "material.changed", {});
  return { materials: await listMaterials(roomId) };
});
