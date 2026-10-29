import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { forbidden, notFound } from "@/lib/api/errors";
import { broadcastResults, loadActivity } from "@/lib/data/activities";
import { db } from "@/lib/supabase/admin";

/** 아이디어 지우기 (본인 또는 강사) */
export const DELETE = roomHandler({}, async ({ actor, roomId, params }) => {
  if (!isUuid(params.id) || !isUuid(params.ideaId)) throw notFound();
  const row = await loadActivity(roomId, params.id);
  if (!row) throw notFound();
  const idea = must(await db().from("idea_notes").select("participant_id").eq("id", params.ideaId).eq("activity_id", row.id).maybeSingle()) as { participant_id: string | null } | null;
  if (!idea) throw notFound();
  if (actor.kind === "participant" && idea.participant_id !== actor.participant.id) throw forbidden("내 아이디어만 지울 수 있어요.");
  must(await db().from("idea_notes").delete().eq("id", params.ideaId));
  await broadcastResults(row);
  return { ok: true };
});
