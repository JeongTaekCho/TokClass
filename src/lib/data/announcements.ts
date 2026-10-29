import "server-only";

import { must } from "@/lib/api/handler";
import { db } from "@/lib/supabase/admin";
import type { Announcement } from "@/lib/types";

export async function listAnnouncements(roomId: string): Promise<Announcement[]> {
  const rows = must(await db().from("announcements").select("id, body, created_at").eq("room_id", roomId).order("created_at", { ascending: false }).limit(20)) as {
    id: string;
    body: string;
    created_at: string;
  }[];
  return rows.map((r) => ({ id: r.id, body: r.body, createdAt: r.created_at }));
}
