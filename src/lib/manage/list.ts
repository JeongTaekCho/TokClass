import "server-only";

import { must } from "@/lib/api/handler";
import { db } from "@/lib/supabase/admin";

export type ManageRoom = {
  id: string;
  title: string;
  status: "active" | "ended";
  locked: boolean;
  capacity: number;
  joinCode: string;
  createdAt: string;
  participantCount: number;
  groups: { id: string; name: string }[];
};

export type ManageParticipant = {
  id: string;
  roomId: string;
  nickname: string;
  kicked: boolean;
  groupId: string | null;
  lastActiveAt: string;
  createdAt: string;
};

/** 수강생 관리 화면 최대 표시 인원 (방 정원 100명 × 여러 방) */
export const MANAGE_LIMIT = 3000;
/** Supabase PostgREST max_rows (config.toml) 보다 크게 요청해도 잘려서 와요. */
const PAGE = 1000;

/** max_rows 제한을 넘는 목록을 쪽 단위로 끝까지(최대 max건) 받아요. */
export async function fetchPaged<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, max = MANAGE_LIMIT): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const rows = must(await page(from, Math.min(from + PAGE, max) - 1)) ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function listManageRooms(ownerId: string): Promise<ManageRoom[]> {
  const d = db();
  const rooms = must(
    await d.from("rooms").select("id, title, status, locked, capacity, join_code, created_at").eq("owner_id", ownerId).order("created_at", { ascending: false }),
  ) as { id: string; title: string; status: "active" | "ended"; locked: boolean; capacity: number; join_code: string; created_at: string }[];
  const ids = rooms.map((r) => r.id);
  if (ids.length === 0) return [];
  const [groups, ...counts] = await Promise.all([
    fetchPaged<{ id: string; room_id: string; name: string }>((from, to) => d.from("groups").select("id, room_id, name").in("room_id", ids).order("position").range(from, to)),
    // 정원 비교용: 강퇴되지 않은 인원 (입장 API와 같은 기준)
    ...ids.map((id) => d.from("participants").select("id", { count: "exact", head: true }).eq("room_id", id).eq("kicked", false)),
  ]);
  const groupMap = new Map<string, { id: string; name: string }[]>();
  for (const g of groups) groupMap.set(g.room_id, [...(groupMap.get(g.room_id) ?? []), { id: g.id, name: g.name }]);
  return rooms.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    locked: r.locked,
    capacity: r.capacity,
    joinCode: r.join_code,
    createdAt: r.created_at,
    participantCount: counts[ids.indexOf(r.id)]?.count ?? 0,
    groups: groupMap.get(r.id) ?? [],
  }));
}

/** roomIds는 반드시 강사 본인 방이어야 해요 (호출하는 쪽에서 owner 확인). */
export async function listManageParticipants(roomIds: string[]): Promise<ManageParticipant[]> {
  if (roomIds.length === 0) return [];
  const rows = await fetchPaged<{ id: string; room_id: string; nickname: string; kicked: boolean; group_id: string | null; last_active_at: string; created_at: string }>((from, to) =>
    db()
      .from("participants")
      .select("id, room_id, nickname, kicked, group_id, last_active_at, created_at")
      .in("room_id", roomIds)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return rows.map((p) => ({
    id: p.id,
    roomId: p.room_id,
    nickname: p.nickname,
    kicked: p.kicked,
    groupId: p.group_id,
    lastActiveAt: p.last_active_at,
    createdAt: p.created_at,
  }));
}
