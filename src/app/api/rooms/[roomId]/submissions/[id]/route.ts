import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { forbidden, notFound } from "@/lib/api/errors";
import { canSeeSubmission, loadSubmission, toSubmissions } from "@/lib/data/submissions";
import { broadcast } from "@/lib/realtime/server";
import { BUCKETS, removeFiles } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import { submissionPatchSchema } from "@/lib/validation/board";

export const GET = roomHandler({ allowEnded: true }, async ({ actor, roomId, params }) => {
  if (!isUuid(params.id)) throw notFound();
  const row = await loadSubmission(roomId, params.id);
  if (!row || !canSeeSubmission(row, actor)) throw notFound("산출물을 찾을 수 없어요.");
  const [submission] = await toSubmissions([row], actor);
  return { submission };
});

/** 베스트 선정·숨김·섹션 변경 (강사) */
export const PATCH = roomHandler({ roles: ["instructor"], body: submissionPatchSchema, allowEnded: true }, async ({ actor, roomId, params, body }) => {
  if (!isUuid(params.id)) throw notFound();
  const update: Record<string, unknown> = {};
  if (body.isBest !== undefined) update.is_best = body.isBest;
  if (body.hidden !== undefined) update.hidden = body.hidden;
  if (body.section !== undefined) update.section = body.section || null;
  must(await db().from("submissions").update(update).eq("id", params.id).eq("room_id", roomId));
  const row = await loadSubmission(roomId, params.id);
  if (!row) throw notFound();
  await broadcast(roomId, "submission.changed", { id: row.id, groupId: row.group_id });
  const [submission] = await toSubmissions([row], actor);
  return { submission };
});

/** 삭제 (작성자 또는 강사) */
export const DELETE = roomHandler({}, async ({ actor, roomId, params }) => {
  if (!isUuid(params.id)) throw notFound();
  const row = await loadSubmission(roomId, params.id);
  if (!row) throw notFound();
  if (actor.kind === "participant" && row.participant_id !== actor.participant.id) throw forbidden("내 산출물만 지울 수 있어요.");
  must(await db().from("submissions").delete().eq("id", row.id));
  await removeFiles(BUCKETS.uploads, [row.storage_path]);
  await broadcast(roomId, "submission.changed", { id: row.id, groupId: row.group_id });
  return { ok: true };
});
