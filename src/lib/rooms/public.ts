import { normalizeSettings } from "@/lib/rooms/templates";
import type { PublicRoom, RoomRow } from "@/lib/types";

export function toPublicRoom(row: RoomRow): PublicRoom {
  return {
    id: row.id,
    title: row.title,
    joinCode: row.join_code,
    status: row.status,
    locked: row.locked,
    focusMode: row.focus_mode,
    capacity: row.capacity,
    startsAt: row.starts_at,
    settings: normalizeSettings(row.settings),
    currentMaterialId: row.current_material_id,
    currentPage: row.current_page,
  };
}

const SETTING_KEYS = ["tabs", "defaultTab", "qaRevealAuthor", "redThreshold", "aiDailyLimit", "sections"] as const;

/** 설정 저장 요청을 화면에 바로 반영할 때(낙관적 업데이트) 쓰는 미리보기. 서버 응답이 오면 그 값으로 바꿔요. */
export function previewRoomPatch(room: PublicRoom, body: Record<string, unknown>): PublicRoom {
  const settings = { ...room.settings } as Record<string, unknown>;
  const top: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if ((SETTING_KEYS as readonly string[]).includes(k)) settings[k] = v;
    else if (["title", "capacity", "locked", "focusMode", "status"].includes(k)) top[k] = v;
  }
  return { ...room, ...top, settings: settings as PublicRoom["settings"] };
}
