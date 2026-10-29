import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { canSeeSubmission, loadSubmission } from "@/lib/data/submissions";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import type { SubmissionComment } from "@/lib/types";
import { commentSchema } from "@/lib/validation/board";

type Row = { id: string; participant_id: string | null; body: string; hidden: boolean; created_at: string; participant: { nickname: string } | null };

export const GET = roomHandler({ allowEnded: true }, async ({ actor, roomId, params }) => {
  if (!isUuid(params.id)) throw notFound();
  const sub = await loadSubmission(roomId, params.id);
  if (!sub || !canSeeSubmission(sub, actor)) throw notFound();
  let q = db().from("submission_comments").select("id, participant_id, body, hidden, created_at, participant:participants(nickname)").eq("submission_id", sub.id).order("created_at").limit(300);
  if (actor.kind === "participant") q = q.eq("hidden", false);
  const rows = must(await q) as unknown as Row[];
  const comments: SubmissionComment[] = rows.map((r) => ({
    id: r.id,
    body: r.body,
    author: r.participant_id ? { kind: "participant", nickname: r.participant?.nickname ?? "알 수 없음" } : { kind: "instructor", nickname: "강사" },
    mine: actor.kind === "participant" ? r.participant_id === actor.participant.id : r.participant_id === null,
    createdAt: r.created_at,
  }));
  return { comments };
});

export const POST = roomHandler({ body: commentSchema }, async ({ actor, roomId, params, body }) => {
  if (!isUuid(params.id)) throw notFound();
  const sub = await loadSubmission(roomId, params.id);
  if (!sub || !canSeeSubmission(sub, actor)) throw notFound();
  must(
    await db()
      .from("submission_comments")
      .insert({ submission_id: sub.id, room_id: roomId, participant_id: actor.kind === "participant" ? actor.participant.id : null, body: body.body }),
  );
  await broadcast(roomId, "submission.changed", { id: sub.id, groupId: sub.group_id });
  return { ok: true };
});
