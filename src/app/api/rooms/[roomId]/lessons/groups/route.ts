import { must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { countRoomLessons, nextPosition, roomLessonsChanged } from "@/lib/data/lessons";
import { LESSON_LIMITS } from "@/lib/lessons/rules";
import { db } from "@/lib/supabase/admin";
import { lessonGroupCreateSchema } from "@/lib/validation/lessons";

/** 빈 교안 묶음 만들기 (강사) */
export const POST = roomHandler({ roles: ["instructor"], body: lessonGroupCreateSchema, allowEnded: true }, async ({ roomId, body }) => {
  const counts = await countRoomLessons(roomId);
  if (counts.groups >= LESSON_LIMITS.roomGroups) throw new ApiError(400, `교안 묶음은 방마다 ${LESSON_LIMITS.roomGroups}개까지 만들 수 있어요.`);
  const position = await nextPosition("room_lesson_groups", "room_id", roomId);
  must(await db().from("room_lesson_groups").insert({ room_id: roomId, title: body.title, intro: body.intro, categories: body.categories, position }));
  return roomLessonsChanged(roomId);
});
