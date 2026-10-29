import "server-only";

import type { Actor } from "@/lib/auth/actor";
import { computeResults, resultsVisible, sanitizeActivity, type IdeaInput, type ResponseInput, type Viewer } from "@/lib/activities/results";
import { must } from "@/lib/api/handler";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import type { Activity, ActivityConfig, ActivityResults } from "@/lib/types";

export type ActivityRow = {
  id: string;
  room_id: string;
  type: Activity["type"];
  title: string;
  config: ActivityConfig;
  status: Activity["status"];
  position: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export function toActivity(r: ActivityRow): Activity {
  return { id: r.id, type: r.type, title: r.title, config: r.config ?? {}, status: r.status, startedAt: r.started_at, endedAt: r.ended_at, createdAt: r.created_at };
}

export function viewerOf(actor: Actor): Viewer {
  return actor.kind === "instructor" ? { kind: "instructor" } : { kind: "participant", id: actor.participant.id };
}

export async function loadActivity(roomId: string, id: string) {
  return must(await db().from("activities").select("*").eq("id", id).eq("room_id", roomId).maybeSingle()) as ActivityRow | null;
}

/** 방 전체 퀴즈 점수판 (상위 10명) */
export async function quizLeaderboard(roomId: string) {
  const rows = must(
    await db().from("activity_responses").select("score, participant:participants(nickname), activity:activities!inner(type)").eq("room_id", roomId).eq("activity.type", "quiz"),
  ) as unknown as { score: number; participant: { nickname: string } | null }[];
  const sum = new Map<string, number>();
  for (const r of rows) {
    const name = r.participant?.nickname ?? "알 수 없음";
    sum.set(name, (sum.get(name) ?? 0) + r.score);
  }
  return [...sum.entries()]
    .map(([nickname, score]) => ({ nickname, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export async function computeActivityResults(row: ActivityRow, viewer: Viewer): Promise<ActivityResults> {
  const d = db();
  const responses = must(
    await d.from("activity_responses").select("id, participant_id, data, score, created_at, participant:participants(nickname)").eq("activity_id", row.id).order("created_at").limit(2000),
  ) as unknown as { id: string; participant_id: string; data: Record<string, unknown>; score: number; created_at: string; participant: { nickname: string } | null }[];
  const inputs: ResponseInput[] = responses.map((r) => ({ id: r.id, participantId: r.participant_id, nickname: r.participant?.nickname ?? "", data: r.data, score: r.score, createdAt: r.created_at }));

  let ideas: IdeaInput[] | undefined;
  let liked: Set<string> | undefined;
  if (row.type === "ideas") {
    const rows = must(
      await d.from("idea_notes").select("id, participant_id, body, color, like_count, participant:participants(nickname)").eq("activity_id", row.id).order("created_at").limit(500),
    ) as unknown as { id: string; participant_id: string | null; body: string; color: string; like_count: number; participant: { nickname: string } | null }[];
    ideas = rows.map((i) => ({ id: i.id, participantId: i.participant_id, nickname: i.participant?.nickname ?? (i.participant_id ? null : "강사"), body: i.body, color: i.color, likeCount: i.like_count }));
    if (viewer.kind === "participant" && rows.length > 0) {
      const likes = must(await d.from("idea_likes").select("idea_id").eq("participant_id", viewer.id).in("idea_id", rows.map((r) => r.id))) as { idea_id: string }[];
      liked = new Set(likes.map((l) => l.idea_id));
    }
  }
  let participantCount: number | undefined;
  if (row.type === "task") {
    const { count } = await d.from("participants").select("id", { count: "exact", head: true }).eq("room_id", row.room_id).eq("kicked", false);
    participantCount = count ?? 0;
  }
  const leaderboard = row.type === "quiz" && row.config.leaderboard ? await quizLeaderboard(row.room_id) : undefined;
  return computeResults(row.type, row.config, inputs, { viewer, ideas, likedIdeaIds: liked, participantCount, leaderboard });
}

/** 결과가 바뀌면 방에 알려요. 수강생에게 아직 공개하지 않는 결과는 null로 보내고, 강사 화면은 다시 조회해요. */
export async function broadcastResults(row: ActivityRow) {
  const activity = toActivity(row);
  const results = resultsVisible(activity, "participant") ? await computeActivityResults(row, { kind: "public" }) : null;
  await broadcast(row.room_id, "activity.results", { activityId: row.id, results });
}

export async function broadcastActivity(row: ActivityRow) {
  await broadcast(row.room_id, "activity.changed", { activity: sanitizeActivity(toActivity(row), "participant") });
}
