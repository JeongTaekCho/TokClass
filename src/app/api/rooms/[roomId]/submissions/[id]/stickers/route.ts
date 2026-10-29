import { isUuid, roomHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { canSeeSubmission, loadSubmission, toSubmissions } from "@/lib/data/submissions";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import { stickerSchema } from "@/lib/validation/board";

/** 스티커 토글 */
export const POST = roomHandler({ body: stickerSchema }, async ({ actor, roomId, params, body }) => {
  if (!isUuid(params.id)) throw notFound();
  const sub = await loadSubmission(roomId, params.id);
  if (!sub || !canSeeSubmission(sub, actor)) throw notFound();
  const actorKey = actor.kind === "instructor" ? "instructor" : actor.participant.id;
  const { data: existing } = await db().from("submission_stickers").select("sticker").eq("submission_id", sub.id).eq("actor_key", actorKey).eq("sticker", body.sticker).maybeSingle();
  if (existing) await db().from("submission_stickers").delete().eq("submission_id", sub.id).eq("actor_key", actorKey).eq("sticker", body.sticker);
  else
    await db()
      .from("submission_stickers")
      .insert({ submission_id: sub.id, room_id: roomId, actor_key: actorKey, participant_id: actor.kind === "participant" ? actor.participant.id : null, sticker: body.sticker });
  await broadcast(roomId, "submission.changed", { id: sub.id, groupId: sub.group_id });
  const [submission] = await toSubmissions([(await loadSubmission(roomId, sub.id))!], actor);
  return { submission };
});
