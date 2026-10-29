import "server-only";

import { must } from "@/lib/api/handler";
import { db } from "@/lib/supabase/admin";
import type { Group } from "@/lib/types";

export async function listGroups(roomId: string): Promise<Group[]> {
  const [groups, members] = await Promise.all([
    db().from("groups").select("id, name, position").eq("room_id", roomId).order("position"),
    db().from("participants").select("group_id").eq("room_id", roomId).eq("kicked", false).not("group_id", "is", null),
  ]);
  const counts = new Map<string, number>();
  for (const m of must(members) as { group_id: string }[]) counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
  return (must(groups) as { id: string; name: string }[]).map((g) => ({ id: g.id, name: g.name, memberCount: counts.get(g.id) ?? 0 }));
}

/** 피셔-예이츠 셔플 후 순서대로 조에 배정 (인원 차이 최대 1명) */
export function distribute<T>(items: T[], groupCount: number, random: () => number = Math.random): T[][] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  const out: T[][] = Array.from({ length: groupCount }, () => []);
  arr.forEach((item, i) => out[i % groupCount]!.push(item));
  return out;
}
