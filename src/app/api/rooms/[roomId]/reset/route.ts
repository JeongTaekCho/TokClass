import { must, roomHandler } from "@/lib/api/handler";
import { broadcast, broadcastMany } from "@/lib/realtime/server";
import { toPublicRoom } from "@/lib/rooms/public";
import { normalizeSettings } from "@/lib/rooms/templates";
import { BUCKETS, removeRoomFiles } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import type { RoomRow } from "@/lib/types";

/** 전체 초기화: 참여자와 수업 중 기록을 모두 지우고, 교안·자료실·활동 구성은 남겨요. */
export const POST = roomHandler({ roles: ["instructor"] }, async ({ roomId, actor }) => {
  const d = db();
  // 지워질 수강생 화면을 먼저 내보내요 (지운 뒤에는 채널 권한이 없어 이벤트를 못 받아요).
  const people = must(await d.from("participants").select("id").eq("room_id", roomId)) as { id: string }[];
  await broadcastMany(
    roomId,
    people.map((p) => ({ event: "participant.session" as const, payload: { participantId: p.id, reason: "kicked" as const } })),
  );
  // 자식 기록부터 지우고 참여자·조는 마지막에 지워요. 중간에 실패해도 다시 누르면 이어서 지워져요.
  const tables = [
    "messages",
    "questions",
    "submissions",
    "announcements",
    "page_reactions",
    "idea_notes",
    "help_requests",
    "understanding_events",
    "understanding_current",
    "login_attempts",
    "ai_usage",
    "participants",
    "groups",
  ];
  for (const t of tables) must(await d.from(t).delete().eq("room_id", roomId));
  must(await d.from("activities").update({ status: "draft", started_at: null, ended_at: null }).eq("room_id", roomId));
  await removeRoomFiles(roomId, [BUCKETS.uploads], ["resources"]);

  const settings = normalizeSettings(actor.room.settings);
  settings.groups = { ...settings.groups, active: false };
  const room = must(await d.from("rooms").update({ settings, current_page: 1 }).eq("id", roomId).select("*").single()) as RoomRow;
  await broadcast(roomId, "room.updated", { room: toPublicRoom(room) });
  return { ok: true };
});
