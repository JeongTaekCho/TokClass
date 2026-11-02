import { isUuid, roomHandler } from "@/lib/api/handler";
import { badRequest } from "@/lib/api/errors";
import { fetchPaged } from "@/lib/data/paged";
import { db } from "@/lib/supabase/admin";

export type PagePins = Record<number, { questions: number; reactions: Record<string, number>; total: number }>;

/** 슬라이드 페이지별 질문·반응 개수 (강사) */
export const GET = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId, search }) => {
  const materialId = search.get("materialId");
  if (!isUuid(materialId)) throw badRequest();
  const [reactions, questions] = await Promise.all([
    fetchPaged<{ page: number; emoji: string }>((from, to) => db().from("page_reactions").select("page, emoji").eq("room_id", roomId).eq("material_id", materialId).order("id").range(from, to)),
    fetchPaged<{ page: number }>((from, to) => db().from("questions").select("page").eq("room_id", roomId).eq("material_id", materialId).eq("hidden", false).not("page", "is", null).order("id").range(from, to)),
  ]);
  const pins: PagePins = {};
  const at = (p: number) => (pins[p] ??= { questions: 0, reactions: {}, total: 0 });
  for (const r of reactions) {
    const e = at(r.page);
    e.reactions[r.emoji] = (e.reactions[r.emoji] ?? 0) + 1;
    e.total += 1;
  }
  for (const q of questions) {
    const e = at(q.page);
    e.questions += 1;
    e.total += 1;
  }
  return { pins };
});
