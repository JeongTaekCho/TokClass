import { must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { roomLessonsChanged } from "@/lib/data/lessons";
import { diffOrder } from "@/lib/lessons/rules";
import { db } from "@/lib/supabase/admin";
import { roomReorderSchema } from "@/lib/validation/lessons";

/** 그룹 순서와 그룹마다 카드 순서를 한 번에 저장 (강사). 바뀐 행만 고쳐요. */
export const POST = roomHandler({ roles: ["instructor"], body: roomReorderSchema, allowEnded: true }, async ({ roomId, body }) => {
  const d = db();
  const [groups, cards] = await Promise.all([
    d.from("room_lesson_groups").select("id, position").eq("room_id", roomId),
    d.from("room_lesson_cards").select("id, group_id, position").eq("room_id", roomId),
  ]);
  const groupNow = new Map((must(groups) as { id: string; position: number }[]).map((g) => [g.id, { parent: roomId, position: g.position }]));
  const cardNow = new Map((must(cards) as { id: string; group_id: string; position: number }[]).map((c) => [c.id, { parent: c.group_id, position: c.position }]));
  const seen = new Set<string>();
  for (const g of body.groups) {
    if (!groupNow.has(g.id)) throw new ApiError(400, "없는 교안 묶음이 있어요. 새로고침해 주세요.");
    for (const id of g.cardIds) {
      if (!cardNow.has(id) || seen.has(id)) throw new ApiError(400, "없는 교안 카드가 있어요. 새로고침해 주세요.");
      seen.add(id);
    }
  }
  const groupChanges = diffOrder([{ parent: roomId, ids: body.groups.map((g) => g.id) }], groupNow);
  const cardChanges = diffOrder(body.groups.map((g) => ({ parent: g.id, ids: g.cardIds })), cardNow);
  await Promise.all([
    ...groupChanges.map((c) => d.from("room_lesson_groups").update({ position: c.position }).eq("id", c.id).then(must)),
    ...cardChanges.map((c) => d.from("room_lesson_cards").update({ group_id: c.parent, position: c.position }).eq("id", c.id).then(must)),
  ]);
  return roomLessonsChanged(roomId);
});
