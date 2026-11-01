import "server-only";

import { computeActivityResults, toActivity, type ActivityRow } from "@/lib/data/activities";
import { must } from "@/lib/api/handler";
import { fetchPaged } from "@/lib/data/paged";
import { bucketUnderstanding, participationStats, topQuestions, type Interaction, type UnderstandingEvent } from "@/lib/report/aggregate";
import { db } from "@/lib/supabase/admin";

/** 수업 리포트 (집계 기반) */
export async function buildReport(roomId: string) {
  const d = db();
  // PostgREST max_rows(1000) 때문에 큰 목록은 쪽 단위로 끝까지 읽어요. 정렬은 항상 고유해야 해요.
  const all = <T,>(build: () => any, order: string[]) => // eslint-disable-line @typescript-eslint/no-explicit-any
    fetchPaged<T>((from, to) => order.reduce((q, col) => q.order(col), build()).range(from, to));
  const [people, msgs, qs, votes, resps, ideas, subs, comments, stickers, events, help, reactions, chatReactions, acts] = await Promise.all([
    all(() => d.from("participants").select("id, nickname, kicked, created_at").eq("room_id", roomId), ["created_at", "id"]),
    all(() => d.from("messages").select("participant_id").eq("room_id", roomId).not("participant_id", "is", null), ["created_at", "id"]),
    all(() => d.from("questions").select("id, participant_id, body, vote_count, created_at, hidden, answered, anonymous").eq("room_id", roomId), ["created_at", "id"]),
    all(() => d.from("question_votes").select("participant_id, question:questions!inner(room_id)").eq("question.room_id", roomId), ["question_id", "participant_id"]),
    all(() => d.from("activity_responses").select("participant_id").eq("room_id", roomId), ["id"]),
    all(() => d.from("idea_notes").select("participant_id").eq("room_id", roomId), ["id"]),
    all(() => d.from("submissions").select("participant_id").eq("room_id", roomId), ["id"]),
    all(() => d.from("submission_comments").select("participant_id").eq("room_id", roomId), ["id"]),
    all(() => d.from("submission_stickers").select("participant_id").eq("room_id", roomId), ["submission_id", "actor_key", "sticker"]),
    all(() => d.from("understanding_events").select("participant_id, status, created_at").eq("room_id", roomId), ["created_at", "id"]),
    all(() => d.from("help_requests").select("participant_id").eq("room_id", roomId), ["id"]),
    all(() => d.from("page_reactions").select("participant_id").eq("room_id", roomId), ["id"]),
    // 채팅 메시지 반응 (테이블이 아직 없으면 빈 목록)
    all(() => d.from("message_reactions").select("participant_id").eq("room_id", roomId), ["id"]).catch(() => []),
    d.from("activities").select("*").eq("room_id", roomId).neq("status", "draft").order("position"),
  ]);

  const participants = (people as { id: string; nickname: string; kicked: boolean }[]).filter((p) => !p.kicked);
  const pidRows = (r: unknown, kind: string): Interaction[] => (r as { participant_id: string | null }[]).map((x) => ({ participantId: x.participant_id, kind }));
  const questionRows = qs as { id: string; participant_id: string | null; body: string; vote_count: number; created_at: string; hidden: boolean; answered: boolean }[];
  const understandingEvents = events as UnderstandingEvent[];
  const interactions: Interaction[] = [
    ...pidRows(msgs, "chat"),
    ...questionRows.map((q) => ({ participantId: q.participant_id, kind: "question" })),
    ...pidRows(votes, "vote"),
    ...pidRows(resps, "activity"),
    ...pidRows(ideas, "activity"),
    ...pidRows(subs, "submission"),
    ...pidRows(comments, "feedback"),
    ...pidRows(stickers, "feedback"),
    ...understandingEvents.map((e) => ({ participantId: e.participant_id, kind: "understanding" })),
    ...pidRows(help, "help"),
    ...pidRows(reactions, "reaction"),
    ...pidRows(chatReactions, "reaction"),
  ];
  const stats = participationStats(
    participants.map((p) => p.id),
    interactions,
  );
  const activities = await Promise.all(
    (must(acts) as ActivityRow[]).map(async (row) => ({ activity: toActivity(row), results: await computeActivityResults(row, { kind: "instructor" }) })),
  );
  const names = new Map(participants.map((p) => [p.id, p.nickname]));

  return {
    participants: participants.length,
    participationRate: stats.participationRate,
    avgInteractions: stats.avgInteractions,
    totalInteractions: stats.totalInteractions,
    byKind: stats.byKind,
    understandingTrend: bucketUnderstanding(understandingEvents, 5 * 60_000),
    topQuestions: topQuestions(questionRows, 5).map((q) => ({ id: q.id, body: q.body, votes: q.vote_count, answered: q.answered })),
    questionCount: questionRows.filter((q) => !q.hidden).length,
    activities,
    leastActive: participants
      .map((p) => ({ nickname: p.nickname, count: stats.perPerson[p.id] ?? 0 }))
      .sort((a, b) => a.count - b.count)
      .slice(0, 5),
    names: Object.fromEntries(names),
  };
}
export type Report = Awaited<ReturnType<typeof buildReport>>;
