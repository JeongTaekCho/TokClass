import { must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import type { HelpRequest } from "@/lib/types";
import { helpCreateSchema } from "@/lib/validation/class";

type Row = { id: string; participant_id: string; message: string; status: "open" | "resolved"; created_at: string; participant?: { nickname: string } | null };
const toHelp = (r: Row): HelpRequest => ({
  id: r.id,
  participantId: r.participant_id,
  nickname: r.participant?.nickname ?? "",
  message: r.message,
  status: r.status,
  createdAt: r.created_at,
});

/** 강사: 대기열(열린 요청 + 최근 처리) / 수강생: 내 열린 요청 */
export const GET = roomHandler({ allowEnded: true }, async ({ actor, roomId }) => {
  const d = db();
  if (actor.kind === "participant") {
    const { data } = await d.from("help_requests").select("*").eq("room_id", roomId).eq("participant_id", actor.participant.id).eq("status", "open").maybeSingle();
    return { request: data ? toHelp(data as Row) : null };
  }
  const [open, done] = await Promise.all([
    d.from("help_requests").select("*, participant:participants(nickname)").eq("room_id", roomId).eq("status", "open").order("created_at"),
    d.from("help_requests").select("*, participant:participants(nickname)").eq("room_id", roomId).eq("status", "resolved").order("resolved_at", { ascending: false }).limit(10),
  ]);
  return { open: (must(open) as Row[]).map(toHelp), resolved: (must(done) as Row[]).map(toHelp) };
});

/** 손들기 */
export const POST = roomHandler({ roles: ["participant"], body: helpCreateSchema }, async ({ actor, roomId, body }) => {
  if (actor.kind !== "participant") throw new ApiError(403, "권한이 없어요.");
  const pid = actor.participant.id;
  const { data: existing } = await db().from("help_requests").select("id").eq("room_id", roomId).eq("participant_id", pid).eq("status", "open").maybeSingle();
  let row: Row;
  if (existing) {
    row = must(await db().from("help_requests").update({ message: body.message }).eq("id", existing.id).select("*").single()) as Row;
  } else {
    row = must(await db().from("help_requests").insert({ room_id: roomId, participant_id: pid, message: body.message }).select("*").single()) as Row;
  }
  await broadcast(roomId, "help.changed", { participantId: pid, status: "open" });
  return { request: toHelp(row) };
});
