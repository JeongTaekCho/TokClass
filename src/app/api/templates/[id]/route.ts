import { apiHandler, isUuid, must } from "@/lib/api/handler";
import { notFound, unauthorized } from "@/lib/api/errors";
import { db } from "@/lib/supabase/admin";
import { getInstructor } from "@/lib/supabase/server";

export const DELETE = apiHandler({}, async ({ params }) => {
  const user = await getInstructor();
  if (!user) throw unauthorized("로그인이 필요해요.");
  if (!isUuid(params.id)) throw notFound();
  must(await db().from("room_templates").delete().eq("id", params.id).eq("owner_id", user.id));
  return { ok: true };
});
