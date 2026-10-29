import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { listResources } from "@/lib/data/resources";
import { broadcast } from "@/lib/realtime/server";
import { BUCKETS, removeFiles } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";

export const DELETE = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId, params }) => {
  if (!isUuid(params.id)) throw notFound();
  const row = must(await db().from("resources").select("storage_path").eq("id", params.id).eq("room_id", roomId).maybeSingle()) as { storage_path: string | null } | null;
  if (!row) throw notFound();
  must(await db().from("resources").delete().eq("id", params.id));
  await removeFiles(BUCKETS.uploads, [row.storage_path]);
  await broadcast(roomId, "resource.changed", {});
  return { resources: await listResources(roomId) };
});
