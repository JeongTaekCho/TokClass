import { instructorHandler, isUuid, must } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { loadOwnedParticipants } from "@/lib/manage/participants";
import { db } from "@/lib/supabase/admin";

type Status = "green" | "yellow" | "red";

/** 수강생 상세: 활동 수, 이해도 기록 요약, 도움 요청 이력 (본인 방 수강생만) */
export const GET = instructorHandler({}, async ({ params, access }) => {
  if (!isUuid(params.pid)) throw notFound();
  const [p] = await loadOwnedParticipants(access.user.id, [params.pid]);
  if (!p) throw notFound("수강생을 찾을 수 없어요.");

  const d = db();
  const head = { count: "exact" as const, head: true };
  const count = (table: string, status?: Status) => {
    let q = d.from(table).select("id", head).eq("room_id", p.room_id).eq("participant_id", p.id);
    if (status) q = q.eq("status", status);
    return q;
  };
  const [chats, questions, submissions, responses, green, yellow, red, current, help] = await Promise.all([
    count("messages"),
    count("questions"),
    count("submissions"),
    count("activity_responses"),
    count("understanding_events", "green"),
    count("understanding_events", "yellow"),
    count("understanding_events", "red"),
    d.from("understanding_current").select("status, updated_at").eq("room_id", p.room_id).eq("participant_id", p.id).maybeSingle(),
    d
      .from("help_requests")
      .select("id, message, status, created_at, resolved_at")
      .eq("room_id", p.room_id)
      .eq("participant_id", p.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const cur = must(current) as { status: Status; updated_at: string } | null;
  return {
    counts: {
      chats: chats.count ?? 0,
      questions: questions.count ?? 0,
      submissions: submissions.count ?? 0,
      responses: responses.count ?? 0,
    },
    understanding: {
      green: green.count ?? 0,
      yellow: yellow.count ?? 0,
      red: red.count ?? 0,
      current: cur?.status ?? null,
      updatedAt: cur?.updated_at ?? null,
    },
    help: (must(help) as { id: string; message: string; status: "open" | "resolved"; created_at: string; resolved_at: string | null }[]).map((h) => ({
      id: h.id,
      message: h.message,
      status: h.status,
      createdAt: h.created_at,
      resolvedAt: h.resolved_at,
    })),
  };
});
