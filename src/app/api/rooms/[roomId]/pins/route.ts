import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { badRequest } from "@/lib/api/errors";
import { db } from "@/lib/supabase/admin";

export type PagePins = Record<number, { questions: number; reactions: Record<string, number>; total: number }>;

/** 교안 페이지별 질문·반응 개수 (강사) */
export const GET = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId, search }) => {
  const materialId = search.get("materialId");
  if (!isUuid(materialId)) throw badRequest();
  const [reactions, questions] = await Promise.all([
    db().from("page_reactions").select("page, emoji").eq("room_id", roomId).eq("material_id", materialId).limit(10000),
    db().from("questions").select("page").eq("room_id", roomId).eq("material_id", materialId).eq("hidden", false).not("page", "is", null),
  ]);
  const pins: PagePins = {};
  const at = (p: number) => (pins[p] ??= { questions: 0, reactions: {}, total: 0 });
  for (const r of must(reactions) as { page: number; emoji: string }[]) {
    const e = at(r.page);
    e.reactions[r.emoji] = (e.reactions[r.emoji] ?? 0) + 1;
    e.total += 1;
  }
  for (const q of must(questions) as { page: number }[]) {
    const e = at(q.page);
    e.questions += 1;
    e.total += 1;
  }
  return { pins };
});
