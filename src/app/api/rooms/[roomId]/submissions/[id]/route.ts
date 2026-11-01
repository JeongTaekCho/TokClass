import { assertTabOpen, isUuid, must, roomHandler } from "@/lib/api/handler";
import { ApiError, forbidden, notFound } from "@/lib/api/errors";
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

/**
 * 산출물 고치기
 * - 강사: 베스트 선정·숨김·섹션 변경 (누구의 산출물이든)
 * - 작성자: 제목·설명·링크·섹션 수정 (내 산출물만, 수업 중일 때만)
 */
export const PATCH = roomHandler({ body: submissionPatchSchema, allowEnded: true }, async ({ actor, roomId, params, body }) => {
  if (!isUuid(params.id)) throw notFound();
  const current = await loadSubmission(roomId, params.id);
  if (!current || !canSeeSubmission(current, actor)) throw notFound("산출물을 찾을 수 없어요.");

  const moderating = body.isBest !== undefined || body.hidden !== undefined;
  const editing = body.title !== undefined || body.body !== undefined || body.url !== undefined;
  const isAuthor = actor.kind === "participant" ? current.participant_id === actor.participant.id : current.participant_id === null;
  if (moderating && actor.kind !== "instructor") throw forbidden();
  if (editing && !isAuthor) throw forbidden("내 산출물만 고칠 수 있어요.");
  if (body.section !== undefined && actor.kind !== "instructor" && !isAuthor) throw forbidden();
  if (actor.kind === "participant") {
    if (actor.room.status === "ended") throw new ApiError(409, "수업이 끝나서 더 이상 고칠 수 없어요.");
    assertTabOpen(actor, "board");
  }

  const update: Record<string, unknown> = {};
  if (body.isBest !== undefined) update.is_best = body.isBest;
  if (body.hidden !== undefined) update.hidden = body.hidden;
  if (body.section !== undefined) {
    // 조 산출물은 조 섹션에 묶여 있어요. 수강생은 강사가 만든 섹션으로만 옮길 수 있어요.
    if (actor.kind === "participant" && current.group_id) throw new ApiError(400, "조 산출물은 섹션을 바꿀 수 없어요.");
    const next = body.section || null;
    if (next && actor.kind === "participant" && !actor.settings.sections.includes(next)) throw new ApiError(400, "섹션을 다시 골라 주세요.");
    update.section = next;
  }
  if (body.title !== undefined) update.title = body.title;
  if (body.body !== undefined) {
    if (current.kind === "text" && !body.body) throw new ApiError(400, "내용을 입력해 주세요.");
    update.body = body.body;
  }
  if (body.url !== undefined) {
    if (current.kind !== "link") throw new ApiError(400, "링크 산출물만 주소를 바꿀 수 있어요.");
    if (!/^https?:\/\/\S+$/i.test(body.url)) throw new ApiError(400, "링크 주소(http/https)를 확인해 주세요.");
    update.url = body.url;
  }
  if (Object.keys(update).length === 0) throw new ApiError(400, "바꿀 내용이 없어요.");
  must(await db().from("submissions").update(update).eq("id", current.id).eq("room_id", roomId));
  const row = await loadSubmission(roomId, params.id);
  if (!row) throw notFound();
  await broadcast(roomId, "submission.changed", { id: row.id, groupId: row.group_id });
  const [submission] = await toSubmissions([row], actor);
  return { submission };
});

/** 삭제 (작성자 또는 강사) */
export const DELETE = roomHandler({ tab: "board" }, async ({ actor, roomId, params }) => {
  if (!isUuid(params.id)) throw notFound();
  const row = await loadSubmission(roomId, params.id);
  if (!row) throw notFound();
  if (actor.kind === "participant" && row.participant_id !== actor.participant.id) throw forbidden("내 산출물만 지울 수 있어요.");
  must(await db().from("submissions").delete().eq("id", row.id));
  await removeFiles(BUCKETS.uploads, [row.storage_path]);
  await broadcast(roomId, "submission.changed", { id: row.id, groupId: row.group_id });
  return { ok: true };
});
