import { z } from "zod";

import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { scoreQuiz } from "@/lib/activities/results";
import { parseResponse } from "@/lib/activities/schema";
import { broadcastResults, loadActivity } from "@/lib/data/activities";
import { db } from "@/lib/supabase/admin";

/** 활동 응답 (진행 중일 때만, 다시 응답하면 갱신. 퀴즈는 한 번만) */
export const POST = roomHandler({ roles: ["participant"], body: z.object({ data: z.unknown() }) }, async ({ actor, roomId, params, body }) => {
  if (actor.kind !== "participant") throw new ApiError(403, "권한이 없어요.");
  if (!isUuid(params.id)) throw notFound();
  const row = await loadActivity(roomId, params.id);
  if (!row) throw notFound("활동을 찾을 수 없어요.");
  if (row.status !== "live") throw new ApiError(409, "지금은 응답할 수 없어요. 활동이 끝났거나 아직 시작하지 않았어요.");
  if (row.type === "ideas") throw new ApiError(400, "아이디어는 아이디어 보드에 올려 주세요.");

  const data = parseResponse(row.type, row.config, body.data);
  const pid = actor.participant.id;
  let score = 0;

  if (row.type === "quiz") {
    const { data: existing } = await db().from("activity_responses").select("id").eq("activity_id", row.id).eq("participant_id", pid).maybeSingle();
    if (existing) throw new ApiError(409, "답을 냈어요. 퀴즈는 한 번만 낼 수 있어요.");
    const elapsed = Date.now() - new Date(row.started_at ?? row.created_at).getTime();
    if (elapsed > ((row.config.timeLimitSec ?? 30) + 2) * 1000) throw new ApiError(409, "제한 시간이 지났어요.");
    score = scoreQuiz(row.config, data.selected as number[], elapsed);
  }

  const values = { activity_id: row.id, room_id: roomId, participant_id: pid, data, score, updated_at: new Date().toISOString() };
  if (row.type === "quiz") {
    // 동시에 두 번 보내도 처음 낸 답만 인정해요 (덮어쓰지 않고 넣기만, 겹치면 유일성 제약에 걸려요).
    const { error } = await db().from("activity_responses").insert(values);
    if (error?.code === "23505") throw new ApiError(409, "답을 냈어요. 퀴즈는 한 번만 낼 수 있어요.");
    if (error) throw error;
  } else {
    must(await db().from("activity_responses").upsert(values, { onConflict: "activity_id,participant_id" }));
  }
  await broadcastResults(row);
  return { ok: true, myResponse: data };
});
