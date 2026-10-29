import { isUuid, roomHandler } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { broadcastResults, loadActivity } from "@/lib/data/activities";
import { db } from "@/lib/supabase/admin";

/** 아이디어 공감 토글 */
export const POST = roomHandler({ roles: ["participant"] }, async ({ actor, roomId, params }) => {
  if (actor.kind !== "participant") throw new ApiError(403, "권한이 없어요.");
  if (!isUuid(params.id) || !isUuid(params.ideaId)) throw notFound();
  const row = await loadActivity(roomId, params.id);
  if (!row || row.status === "draft") throw notFound();
  const { data: idea } = await db().from("idea_notes").select("id").eq("id", params.ideaId).eq("activity_id", row.id).maybeSingle();
  if (!idea) throw notFound();
  const pid = actor.participant.id;
  const { data: like } = await db().from("idea_likes").select("idea_id").eq("idea_id", params.ideaId).eq("participant_id", pid).maybeSingle();
  if (like) await db().from("idea_likes").delete().eq("idea_id", params.ideaId).eq("participant_id", pid);
  else await db().from("idea_likes").insert({ idea_id: params.ideaId, participant_id: pid });
  await broadcastResults(row);
  return { liked: !like };
});
