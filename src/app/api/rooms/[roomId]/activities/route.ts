import { must, roomHandler } from "@/lib/api/handler";
import { activityCreateSchema } from "@/lib/activities/schema";
import { sanitizeActivity } from "@/lib/activities/results";
import { toActivity, type ActivityRow } from "@/lib/data/activities";
import { db } from "@/lib/supabase/admin";

/** 강사: 전체(준비 포함) / 수강생: 진행 중·종료된 활동 (정답은 종료 후 공개) */
export const GET = roomHandler({ allowEnded: true }, async ({ actor, roomId }) => {
  let q = db().from("activities").select("*").eq("room_id", roomId).order("position").order("created_at");
  if (actor.kind === "participant") q = q.neq("status", "draft");
  const rows = must(await q) as ActivityRow[];
  return { activities: rows.map((r) => sanitizeActivity(toActivity(r), actor.kind)) };
});

export const POST = roomHandler({ roles: ["instructor"], body: activityCreateSchema, allowEnded: true }, async ({ roomId, body }) => {
  const { count } = await db().from("activities").select("id", { count: "exact", head: true }).eq("room_id", roomId);
  if ((count ?? 0) >= 100) throw new Error("활동은 방당 100개까지 만들 수 있어요.");
  const row = must(
    await db().from("activities").insert({ room_id: roomId, type: body.type, title: body.title, config: body.config, position: count ?? 0 }).select("*").single(),
  ) as ActivityRow;
  return { activity: toActivity(row) };
});
