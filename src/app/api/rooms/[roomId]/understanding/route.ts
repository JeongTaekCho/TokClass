import { must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { understandingCounts } from "@/lib/data/understanding";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import { understandingSchema } from "@/lib/validation/class";

/** 강사: 집계 + 최근 30분 이력 / 수강생: 내 상태 */
export const GET = roomHandler({ allowEnded: true }, async ({ actor, roomId }) => {
  if (actor.kind === "participant") {
    const { data } = await db().from("understanding_current").select("status").eq("room_id", roomId).eq("participant_id", actor.participant.id).maybeSingle();
    return { status: data?.status ?? null };
  }
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const [counts, events] = await Promise.all([
    understandingCounts(roomId),
    db().from("understanding_events").select("participant_id, status, created_at").eq("room_id", roomId).gte("created_at", since).order("created_at").limit(5000),
  ]);
  return { counts, events: must(events) };
});

export const POST = roomHandler({ roles: ["participant"], body: understandingSchema }, async ({ actor, roomId, body }) => {
  if (actor.kind !== "participant") throw new ApiError(403, "권한이 없어요.");
  const pid = actor.participant.id;
  must(
    await db()
      .from("understanding_current")
      .upsert({ room_id: roomId, participant_id: pid, status: body.status, updated_at: new Date().toISOString() }, { onConflict: "room_id,participant_id" }),
  );
  must(await db().from("understanding_events").insert({ room_id: roomId, participant_id: pid, status: body.status }));
  // 개인 상태는 보내지 않고 합계만 보내요.
  const counts = await understandingCounts(roomId);
  await broadcast(roomId, "understanding.counts", { counts });
  return { status: body.status };
});

/** 신호등 초기화 (강사): 새 주제를 시작할 때 모두의 표시를 지워요. 이력은 남아요. */
export const DELETE = roomHandler({ roles: ["instructor"] }, async ({ roomId }) => {
  must(await db().from("understanding_current").delete().eq("room_id", roomId));
  const counts = await understandingCounts(roomId);
  await broadcast(roomId, "understanding.counts", { counts, reset: true });
  return { counts };
});
