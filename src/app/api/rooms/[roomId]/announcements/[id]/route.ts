import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { broadcast } from "@/lib/realtime/server";
import { listAnnouncements } from "@/lib/data/announcements";
import { db } from "@/lib/supabase/admin";

export const DELETE = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId, params }) => {
  if (!isUuid(params.id)) throw notFound();
  must(await db().from("announcements").delete().eq("id", params.id).eq("room_id", roomId));
  const announcements = await listAnnouncements(roomId);
  await broadcast(roomId, "announce.changed", { announcements });
  return { announcements };
});
