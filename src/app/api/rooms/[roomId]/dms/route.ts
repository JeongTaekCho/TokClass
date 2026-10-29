import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { ApiError, badRequest } from "@/lib/api/errors";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import type { DirectMessage } from "@/lib/types";
import { dmPostSchema } from "@/lib/validation/comm";

type Row = { id: string; participant_id: string; from_instructor: boolean; body: string; created_at: string; read_at: string | null };

const toDm = (r: Row): DirectMessage => ({
  id: r.id,
  participantId: r.participant_id,
  fromInstructor: r.from_instructor,
  body: r.body,
  createdAt: r.created_at,
  readAt: r.read_at,
});

/**
 * 강사: ?participantId= 로 한 사람과의 대화, 없으면 사람별 요약(안 읽은 수)
 * 수강생: 내 대화만
 */
export const GET = roomHandler({ allowEnded: true }, async ({ actor, roomId, search }) => {
  const d = db();
  if (actor.kind === "instructor") {
    const pid = search.get("participantId");
    if (!pid) {
      const rows = must(
        await d.from("direct_messages").select("participant_id, from_instructor, body, created_at, read_at").eq("room_id", roomId).order("created_at", { ascending: false }).limit(1000),
      ) as Omit<Row, "id">[];
      const summary = new Map<string, { participantId: string; lastBody: string; lastAt: string; unread: number }>();
      for (const r of rows) {
        const s = summary.get(r.participant_id) ?? { participantId: r.participant_id, lastBody: r.body, lastAt: r.created_at, unread: 0 };
        if (!r.from_instructor && !r.read_at) s.unread += 1;
        summary.set(r.participant_id, s);
      }
      return { threads: [...summary.values()] };
    }
    if (!isUuid(pid)) throw badRequest();
    const rows = must(await d.from("direct_messages").select("*").eq("room_id", roomId).eq("participant_id", pid).order("created_at").limit(300)) as Row[];
    await d.from("direct_messages").update({ read_at: new Date().toISOString() }).eq("room_id", roomId).eq("participant_id", pid).eq("from_instructor", false).is("read_at", null);
    return { messages: rows.map(toDm) };
  }

  const pid = actor.participant.id;
  const rows = must(await d.from("direct_messages").select("*").eq("room_id", roomId).eq("participant_id", pid).order("created_at").limit(300)) as Row[];
  const unread = rows.filter((r) => r.from_instructor && !r.read_at).length;
  if (search.get("markRead") === "1" && unread > 0) {
    await d.from("direct_messages").update({ read_at: new Date().toISOString() }).eq("room_id", roomId).eq("participant_id", pid).eq("from_instructor", true).is("read_at", null);
  }
  return { messages: rows.map(toDm), unread: search.get("markRead") === "1" ? 0 : unread };
});

export const POST = roomHandler({ body: dmPostSchema }, async ({ actor, roomId, body }) => {
  let participantId: string;
  if (actor.kind === "instructor") {
    if (!body.participantId) throw badRequest("받는 사람을 골라 주세요.");
    const { data } = await db().from("participants").select("id").eq("id", body.participantId).eq("room_id", roomId).maybeSingle();
    if (!data) throw new ApiError(404, "참여자를 찾을 수 없어요.");
    participantId = body.participantId;
  } else {
    participantId = actor.participant.id;
  }
  const row = must(
    await db()
      .from("direct_messages")
      .insert({ room_id: roomId, participant_id: participantId, from_instructor: actor.kind === "instructor", body: body.body })
      .select("*")
      .single(),
  ) as Row;
  // 내용은 보내지 않고 "새 메시지가 있다"는 신호만 보내요 (받는 사람만 다시 조회).
  await broadcast(roomId, "dm.new", { participantId, fromInstructor: actor.kind === "instructor" });
  return { message: toDm(row) };
});
