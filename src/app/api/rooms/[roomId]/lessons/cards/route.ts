import { must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { cardRow, countRoomLessons, loadRoomGroup, nextPosition, roomLessonsChanged } from "@/lib/data/lessons";
import { LESSON_LIMITS } from "@/lib/lessons/rules";
import { db } from "@/lib/supabase/admin";
import { categoryAllowed, roomCardCreateSchema } from "@/lib/validation/lessons";

/** 교안 카드 만들기 (강사) */
export const POST = roomHandler({ roles: ["instructor"], body: roomCardCreateSchema, allowEnded: true }, async ({ roomId, body }) => {
  const group = await loadRoomGroup(roomId, body.groupId);
  if (!categoryAllowed(body.category, group.categories)) throw new ApiError(400, "묶음에 있는 분류만 고를 수 있어요.");
  const [counts, position] = await Promise.all([countRoomLessons(roomId), nextPosition("room_lesson_cards", "group_id", group.id)]);
  if (counts.cards >= LESSON_LIMITS.roomCards) throw new ApiError(400, `교안 카드는 방마다 ${LESSON_LIMITS.roomCards}장까지 넣을 수 있어요.`);
  if (position >= LESSON_LIMITS.packCards) {
    const { count } = await db().from("room_lesson_cards").select("id", { count: "exact", head: true }).eq("group_id", group.id);
    if ((count ?? 0) >= LESSON_LIMITS.packCards) throw new ApiError(400, `한 묶음에는 카드를 ${LESSON_LIMITS.packCards}장까지 넣을 수 있어요.`);
  }
  must(await db().from("room_lesson_cards").insert({ room_id: roomId, group_id: group.id, ...cardRow(body), position }));
  return roomLessonsChanged(roomId);
});
