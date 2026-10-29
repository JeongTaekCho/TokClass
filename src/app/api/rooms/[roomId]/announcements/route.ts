import { must, roomHandler } from "@/lib/api/handler";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import { listAnnouncements } from "@/lib/data/announcements";
import { announcementSchema } from "@/lib/validation/comm";

export const GET = roomHandler({ allowEnded: true }, async ({ roomId }) => ({ announcements: await listAnnouncements(roomId) }));

export const POST = roomHandler({ roles: ["instructor"], body: announcementSchema }, async ({ roomId, body }) => {
  must(await db().from("announcements").insert({ room_id: roomId, body: body.body }));
  const announcements = await listAnnouncements(roomId);
  await broadcast(roomId, "announce.changed", { announcements });
  return { announcements };
});
