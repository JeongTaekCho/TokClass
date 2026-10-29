import { must, roomHandler } from "@/lib/api/handler";
import { broadcast } from "@/lib/realtime/server";
import { toPublicRoom } from "@/lib/rooms/public";
import { normalizeSettings } from "@/lib/rooms/templates";
import { BUCKETS, removeRoomFiles } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import type { RoomRow } from "@/lib/types";

/** 전체 초기화: 참여자와 수업 중 기록을 모두 지우고, 교안·자료실·활동 구성은 남겨요. */
export const POST = roomHandler({ roles: ["instructor"] }, async ({ roomId, actor }) => {
  const d = db();
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
