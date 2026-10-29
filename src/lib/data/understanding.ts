import "server-only";

import { must } from "@/lib/api/handler";
import { db } from "@/lib/supabase/admin";
import type { UnderstandingCounts } from "@/lib/types";

export async function understandingCounts(roomId: string): Promise<UnderstandingCounts> {
  const [rows, people] = await Promise.all([
    db().from("understanding_current").select("status, participant:participants!understanding_current_participant_id_fkey!inner(kicked)").eq("room_id", roomId).eq("participant.kicked", false),
    db().from("participants").select("id", { count: "exact", head: true }).eq("room_id", roomId).eq("kicked", false),
  ]);
  const counts: UnderstandingCounts = { green: 0, yellow: 0, red: 0, total: people.count ?? 0 };
  for (const r of must(rows) as { status: "green" | "yellow" | "red" }[]) counts[r.status] += 1;
  return counts;
}
