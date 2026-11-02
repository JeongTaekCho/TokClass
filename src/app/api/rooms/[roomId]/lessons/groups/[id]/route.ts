import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { loadRoomGroup, roomLessonsChanged } from "@/lib/data/lessons";
import { db } from "@/lib/supabase/admin";
import { roomGroupPatchSchema } from "@/lib/validation/lessons";

/** 교안 묶음 이름·소개·분류·숨김 바꾸기 (강사). 분류를 지우면 그 분류였던 카드는 분류 없음이 돼요. */
export const PATCH = roomHandler({ roles: ["instructor"], body: roomGroupPatchSchema, allowEnded: true }, async ({ roomId, params, body }) => {
  if (!isUuid(params.id)) throw notFound();
  await loadRoomGroup(roomId, params.id);
  const d = db();
  must(await d.from("room_lesson_groups").update(body).eq("id", params.id));
  if (body.categories) {
    const keep = new Set(body.categories);
    const cards = must(await d.from("room_lesson_cards").select("id, category").eq("group_id", params.id).not("category", "is", null)) as { id: string; category: string }[];
    const orphan = cards.filter((c) => !keep.has(c.category)).map((c) => c.id);
    if (orphan.length) must(await d.from("room_lesson_cards").update({ category: null }).in("id", orphan));
  }
  return roomLessonsChanged(roomId);
});

export const DELETE = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId, params }) => {
  if (!isUuid(params.id)) throw notFound();
  await loadRoomGroup(roomId, params.id);
  must(await db().from("room_lesson_groups").delete().eq("id", params.id));
  return roomLessonsChanged(roomId);
});
