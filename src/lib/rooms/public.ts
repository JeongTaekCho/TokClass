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
