import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { QUESTION_SELECT, toQuestion, type QuestionRow } from "@/lib/data/questions";
import { broadcastMany } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import { questionCreateSchema } from "@/lib/validation/class";

/** Q&A 목록 (?materialId=&page= 로 페이지 질문만) */
export const GET = roomHandler({ allowEnded: true }, async ({ actor, roomId, search }) => {
  let q = db().from("questions").select(QUESTION_SELECT).eq("room_id", roomId).order("vote_count", { ascending: false }).order("created_at", { ascending: false }).limit(300);
  const materialId = search.get("materialId");
  const page = Number(search.get("page"));
  if (isUuid(materialId)) q = q.eq("material_id", materialId);
  if (Number.isInteger(page) && page > 0) q = q.eq("page", page);
  if (actor.kind === "participant") q = q.eq("hidden", false);
  const rows = must(await q) as unknown as QuestionRow[];

  let votedSet = new Set<string>();
  if (actor.kind === "participant" && rows.length > 0) {
    const votes = must(
      await db().from("question_votes").select("question_id").eq("participant_id", actor.participant.id).in("question_id", rows.map((r) => r.id)),
    ) as { question_id: string }[];
    votedSet = new Set(votes.map((v) => v.question_id));
  }
  return { questions: rows.map((r) => toQuestion(r, actor, votedSet.has(r.id))) };
});

export const POST = roomHandler({ roles: ["participant"], body: questionCreateSchema }, async ({ actor, roomId, body }) => {
  if (actor.kind !== "participant") throw new ApiError(403, "권한이 없어요.");
  let materialId: string | null = null;
  let page: number | null = null;
  if (body.materialId) {
    const { data } = await db().from("materials").select("id, page_count").eq("id", body.materialId).eq("room_id", roomId).maybeSingle();
    if (data) {
      materialId = data.id;
      page = body.page && body.page <= data.page_count ? body.page : null;
    }
  }
  const row = must(
    await db()
      .from("questions")
      .insert({ room_id: roomId, participant_id: actor.participant.id, anonymous: body.anonymous, body: body.body, material_id: materialId, page })
      .select(QUESTION_SELECT)
      .single(),
  ) as unknown as QuestionRow;
  await broadcastMany(roomId, [
    { event: "qa.changed", payload: { id: row.id, question: toQuestion(row, null) } },
    ...(materialId ? [{ event: "pins.changed", payload: { materialId } } as const] : []),
  ]);
  return { question: toQuestion(row, actor) };
});
