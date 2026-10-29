import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { forbidden, notFound } from "@/lib/api/errors";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import { helpPatchSchema } from "@/lib/validation/class";

/** 처리 완료(강사) 또는 요청 취소(본인) */
export const PATCH = roomHandler({ body: helpPatchSchema }, async ({ actor, roomId, params, body }) => {
  if (!isUuid(params.id)) throw notFound();
  const row = must(await db().from("help_requests").select("participant_id").eq("id", params.id).eq("room_id", roomId).maybeSingle()) as { participant_id: string } | null;
  if (!row) throw notFound();
  if (actor.kind === "participant" && row.participant_id !== actor.participant.id) throw forbidden();
  must(
    await db()
      .from("help_requests")
      .update({ status: body.status, resolved_at: body.status === "resolved" ? new Date().toISOString() : null })
      .eq("id", params.id),
  );
  await broadcast(roomId, "help.changed", { participantId: row.participant_id, status: body.status });
  return { ok: true };
});
