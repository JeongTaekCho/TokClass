import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { ideaSchema } from "@/lib/activities/schema";
import { broadcastResults, loadActivity } from "@/lib/data/activities";
import { db } from "@/lib/supabase/admin";

/** 아이디어(포스트잇) 올리기 */
export const POST = roomHandler({ body: ideaSchema }, async ({ actor, roomId, params, body }) => {
  if (!isUuid(params.id)) throw notFound();
  const row = await loadActivity(roomId, params.id);
  if (!row || row.type !== "ideas") throw notFound("아이디어 보드를 찾을 수 없어요.");
  if (row.status !== "live") throw new ApiError(409, "아이디어 보드가 열려 있지 않아요.");
  const pid = actor.kind === "participant" ? actor.participant.id : null;
  if (pid) {
    const { count } = await db().from("idea_notes").select("id", { count: "exact", head: true }).eq("activity_id", row.id).eq("participant_id", pid);
    if ((count ?? 0) >= 20) throw new ApiError(400, "한 사람당 아이디어는 20개까지 올릴 수 있어요.");
  }
  must(await db().from("idea_notes").insert({ activity_id: row.id, room_id: roomId, participant_id: pid, body: body.body, color: body.color }));
  await broadcastResults(row);
  return { ok: true };
});
