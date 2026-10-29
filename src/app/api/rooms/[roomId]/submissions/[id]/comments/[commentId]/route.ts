import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { forbidden, notFound } from "@/lib/api/errors";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";

/** 댓글 삭제 (작성자 또는 강사) */
export const DELETE = roomHandler({}, async ({ actor, roomId, params }) => {
  if (!isUuid(params.id) || !isUuid(params.commentId)) throw notFound();
  const row = must(await db().from("submission_comments").select("participant_id, submission_id").eq("id", params.commentId).eq("room_id", roomId).maybeSingle()) as { participant_id: string | null; submission_id: string } | null;
  if (!row) throw notFound();
  if (actor.kind === "participant" && row.participant_id !== actor.participant.id) throw forbidden();
  must(await db().from("submission_comments").delete().eq("id", params.commentId));
  await broadcast(roomId, "submission.changed", { id: row.submission_id, groupId: null });
  return { ok: true };
});
