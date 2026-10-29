import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { forbidden, notFound } from "@/lib/api/errors";
import { loadQuestion, toQuestion } from "@/lib/data/questions";
import { broadcastMany } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import { questionPatchSchema } from "@/lib/validation/class";

/** 답변·답변 완료·숨김 (강사) */
export const PATCH = roomHandler({ roles: ["instructor"], body: questionPatchSchema, allowEnded: true }, async ({ actor, roomId, params, body }) => {
  if (!isUuid(params.id)) throw notFound();
  const update: Record<string, unknown> = {};
  if (body.answer !== undefined) {
    update.answer = body.answer || null;
    if (body.answer && body.answered === undefined) update.answered = true;
  }
  if (body.answered !== undefined) update.answered = body.answered;
  if (body.hidden !== undefined) update.hidden = body.hidden;
  must(await db().from("questions").update(update).eq("id", params.id).eq("room_id", roomId));
  const row = await loadQuestion(roomId, params.id);
  if (!row) throw notFound();
  await broadcastMany(roomId, [
    { event: "qa.changed", payload: { id: row.id, question: row.hidden ? null : toQuestion(row, null) } },
    ...(row.material_id ? [{ event: "pins.changed", payload: { materialId: row.material_id } } as const] : []),
  ]);
  return { question: toQuestion(row, actor) };
});

/** 삭제 (작성자 본인 또는 강사) */
export const DELETE = roomHandler({}, async ({ actor, roomId, params }) => {
  if (!isUuid(params.id)) throw notFound();
  const row = await loadQuestion(roomId, params.id);
  if (!row) throw notFound();
  if (actor.kind === "participant" && row.participant_id !== actor.participant.id) throw forbidden("내 질문만 지울 수 있어요.");
  must(await db().from("questions").delete().eq("id", params.id));
  await broadcastMany(roomId, [
    { event: "qa.changed", payload: { id: row.id, question: null } },
    ...(row.material_id ? [{ event: "pins.changed", payload: { materialId: row.material_id } } as const] : []),
  ]);
  return { ok: true };
});
