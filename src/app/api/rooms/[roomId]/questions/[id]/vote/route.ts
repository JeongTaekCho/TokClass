import { isUuid, roomHandler } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { loadQuestion, toQuestion } from "@/lib/data/questions";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";

/** 공감(👍) 토글 */
export const POST = roomHandler({ roles: ["participant"] }, async ({ actor, roomId, params }) => {
  if (actor.kind !== "participant") throw new ApiError(403, "권한이 없어요.");
  if (!isUuid(params.id)) throw notFound();
  const existing = await loadQuestion(roomId, params.id);
  if (!existing || existing.hidden) throw notFound("질문을 찾을 수 없어요.");
  if (existing.participant_id === actor.participant.id) throw new ApiError(400, "내 질문에는 공감할 수 없어요.");

  const pid = actor.participant.id;
  const { data: vote } = await db().from("question_votes").select("question_id").eq("question_id", params.id).eq("participant_id", pid).maybeSingle();
  if (vote) await db().from("question_votes").delete().eq("question_id", params.id).eq("participant_id", pid);
  else await db().from("question_votes").insert({ question_id: params.id, participant_id: pid });

  const row = (await loadQuestion(roomId, params.id))!;
  await broadcast(roomId, "qa.changed", { id: row.id, question: toQuestion(row, null) });
  return { question: toQuestion(row, actor, !vote) };
});
