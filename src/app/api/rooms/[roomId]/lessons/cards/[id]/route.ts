import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { CARD_COLS, cardInputOf, cardRow, loadRoomGroup, nextPosition, roomLessonsChanged, type CardRow } from "@/lib/data/lessons";
import { LESSON_LIMITS } from "@/lib/lessons/rules";
import { db } from "@/lib/supabase/admin";
import { categoryAllowed, lessonCardSchema, roomCardPatchSchema } from "@/lib/validation/lessons";

async function loadCard(roomId: string, id: string | undefined) {
  if (!isUuid(id)) throw notFound();
  const row = must(await db().from("room_lesson_cards").select(`${CARD_COLS}, group_id, hidden`).eq("id", id).eq("room_id", roomId).maybeSingle()) as CardRow | null;
  if (!row) throw notFound("교안 카드를 찾을 수 없어요.");
  return row;
}

/** 카드 고치기·숨기기·다른 묶음으로 옮기기 (강사). 지금 값과 합친 뒤 다시 검증해요. */
export const PATCH = roomHandler({ roles: ["instructor"], body: roomCardPatchSchema, allowEnded: true }, async ({ roomId, params, body }) => {
  const row = await loadCard(roomId, params.id);
  const { hidden, groupId, ...patch } = body;
  const merged = lessonCardSchema.parse({ ...cardInputOf(row), ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) });
  const moving = groupId !== undefined && groupId !== row.group_id;
  const group = await loadRoomGroup(roomId, moving ? groupId : row.group_id!);
  if (!categoryAllowed(merged.category, group.categories)) {
    // 다른 묶음으로 옮길 때 그 묶음에 없는 분류면 분류를 비워요. 직접 고른 분류가 없으면 400.
    if (moving && patch.category === undefined) merged.category = null;
    else throw new ApiError(400, "묶음에 있는 분류만 고를 수 있어요.");
  }
  const update: Record<string, unknown> = { ...cardRow(merged) };
  if (hidden !== undefined) update.hidden = hidden;
  if (moving) {
    const { count } = await db().from("room_lesson_cards").select("id", { count: "exact", head: true }).eq("group_id", group.id);
    if ((count ?? 0) >= LESSON_LIMITS.packCards) throw new ApiError(400, `한 묶음에는 카드를 ${LESSON_LIMITS.packCards}장까지 넣을 수 있어요.`);
    update.group_id = group.id;
    update.position = await nextPosition("room_lesson_cards", "group_id", group.id);
  }
  must(await db().from("room_lesson_cards").update(update).eq("id", row.id));
  return roomLessonsChanged(roomId);
});

export const DELETE = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId, params }) => {
  const row = await loadCard(roomId, params.id);
  must(await db().from("room_lesson_cards").delete().eq("id", row.id));
  return roomLessonsChanged(roomId);
});
