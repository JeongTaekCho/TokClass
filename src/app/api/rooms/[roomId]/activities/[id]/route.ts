import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { resultsVisible, sanitizeActivity } from "@/lib/activities/results";
import { activityPatchSchema } from "@/lib/activities/schema";
import { broadcastActivity, broadcastResults, computeActivityResults, loadActivity, toActivity, viewerOf, type ActivityRow } from "@/lib/data/activities";
import { db } from "@/lib/supabase/admin";

/** 활동 + 내 응답 + (공개된) 결과 */
export const GET = roomHandler({ allowEnded: true }, async ({ actor, roomId, params }) => {
  if (!isUuid(params.id)) throw notFound();
  const row = await loadActivity(roomId, params.id);
  if (!row || (actor.kind === "participant" && row.status === "draft")) throw notFound("활동을 찾을 수 없어요.");
  const activity = toActivity(row);
  let myResponse: Record<string, unknown> | null = null;
  let myScore: number | null = null;
  if (actor.kind === "participant") {
    const { data } = await db().from("activity_responses").select("data, score").eq("activity_id", row.id).eq("participant_id", actor.participant.id).maybeSingle();
    myResponse = (data?.data as Record<string, unknown>) ?? null;
    myScore = row.status === "ended" && data ? data.score : null;
  }
  const visible = resultsVisible(activity, actor.kind);
  return {
    activity: sanitizeActivity(activity, actor.kind),
    myResponse,
    myScore,
    results: visible ? await computeActivityResults(row, viewerOf(actor)) : null,
  };
});

/** 시작/종료/준비로 되돌리기 (강사). 한 번에 하나의 활동만 진행돼요. */
export const PATCH = roomHandler({ roles: ["instructor"], body: activityPatchSchema }, async ({ roomId, params, body }) => {
  if (!isUuid(params.id)) throw notFound();
  const row = await loadActivity(roomId, params.id);
  if (!row) throw notFound("활동을 찾을 수 없어요.");
  const now = new Date().toISOString();

  if (body.status === "live") {
    // 진행 중인 다른 활동은 종료
    const others = must(await db().from("activities").update({ status: "ended", ended_at: now }).eq("room_id", roomId).eq("status", "live").neq("id", row.id).select("*")) as ActivityRow[];
    for (const o of others) {
      await broadcastActivity(o);
      await broadcastResults(o);
    }
    const update: Partial<ActivityRow> = { status: "live", ended_at: null };
    // 처음 시작하거나 다시 시작할 때 타이머 기준 시각을 새로 잡아요 (퀴즈 제한시간·할 일 타이머)
    update.started_at = now;
    const updated = must(await db().from("activities").update(update).eq("id", row.id).select("*").single()) as ActivityRow;
    await broadcastActivity(updated);
    await broadcastResults(updated);
    return { activity: toActivity(updated) };
  }
  if (body.status === "ended") {
    if (row.status !== "live") throw new ApiError(400, "진행 중인 활동만 종료할 수 있어요.");
    const updated = must(await db().from("activities").update({ status: "ended", ended_at: now }).eq("id", row.id).select("*").single()) as ActivityRow;
    await broadcastActivity(updated);
    await broadcastResults(updated);
    return { activity: toActivity(updated) };
  }
  // draft: 응답을 지우고 처음 상태로
  must(await db().from("activity_responses").delete().eq("activity_id", row.id));
  must(await db().from("idea_notes").delete().eq("activity_id", row.id));
  const updated = must(await db().from("activities").update({ status: "draft", started_at: null, ended_at: null }).eq("id", row.id).select("*").single()) as ActivityRow;
  await broadcastActivity(updated);
  return { activity: toActivity(updated) };
});

export const DELETE = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId, params }) => {
  if (!isUuid(params.id)) throw notFound();
  const row = await loadActivity(roomId, params.id);
  if (!row) throw notFound();
  must(await db().from("activities").delete().eq("id", row.id));
  if (row.status === "live") await broadcastActivity({ ...row, status: "ended", ended_at: new Date().toISOString() });
  return { ok: true };
});
