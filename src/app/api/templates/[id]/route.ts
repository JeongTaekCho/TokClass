import { instructorHandler, isUuid, must } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { db } from "@/lib/supabase/admin";

export const DELETE = instructorHandler({}, async ({ params, access }) => {
  const { user } = access;
  if (!isUuid(params.id)) throw notFound();
  must(await db().from("room_templates").delete().eq("id", params.id).eq("owner_id", user.id));
  return { ok: true };
});
