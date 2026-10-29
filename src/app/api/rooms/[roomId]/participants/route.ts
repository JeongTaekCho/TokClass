import { must, roomHandler } from "@/lib/api/handler";
import { db } from "@/lib/supabase/admin";

type Row = { id: string; nickname: string; kicked: boolean; group_id: string | null; last_active_at: string; created_at: string };

/** 참여자 목록 (강사) */
export const GET = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId }) => {
  const d = db();
  const [rows, statuses, help] = await Promise.all([
    d.from("participants").select("id, nickname, kicked, group_id, last_active_at, created_at").eq("room_id", roomId).order("created_at"),
    d.from("understanding_current").select("participant_id, status").eq("room_id", roomId),
    d.from("help_requests").select("participant_id").eq("room_id", roomId).eq("status", "open"),
  ]);
  const st = new Map((must(statuses) as { participant_id: string; status: string }[]).map((s) => [s.participant_id, s.status]));
  const helping = new Set((must(help) as { participant_id: string }[]).map((h) => h.participant_id));
  return {
    participants: (must(rows) as Row[]).map((p) => ({
      id: p.id,
      nickname: p.nickname,
      kicked: p.kicked,
      groupId: p.group_id,
      lastActiveAt: p.last_active_at,
      createdAt: p.created_at,
      understanding: st.get(p.id) ?? null,
      needsHelp: helping.has(p.id),
    })),
  };
});
