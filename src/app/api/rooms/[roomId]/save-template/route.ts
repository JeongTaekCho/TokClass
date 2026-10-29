import { must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/supabase/admin";
import { templateSaveSchema } from "@/lib/validation/room";

export const POST = roomHandler({ roles: ["instructor"], body: templateSaveSchema }, async ({ actor, body }) => {
  if (actor.kind !== "instructor") throw new ApiError(403, "권한이 없어요.");
  const { count } = await db().from("room_templates").select("id", { count: "exact", head: true }).eq("owner_id", actor.userId);
  if ((count ?? 0) >= 30) throw new ApiError(400, "템플릿은 30개까지 저장할 수 있어요.");
  const settings = { ...(actor.room.settings as object), groups: { active: false, mode: "random" } };
  const row = must(
    await db()
      .from("room_templates")
      .insert({ owner_id: actor.userId, name: body.name, base_template: actor.room.template, settings })
      .select("id, name")
      .single(),
  );
  return { template: row };
});
