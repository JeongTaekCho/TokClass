import { assertTabOpen, roomHandler } from "@/lib/api/handler";
import { listRoomLessons } from "@/lib/data/lessons";

/** 방 교안 목록. 수강생은 교안 탭이 켜져 있어야 하고, 숨긴 그룹·카드는 빼고 받아요. 강사는 전부 받아요. */
export const GET = roomHandler({ allowEnded: true }, async ({ actor, roomId }) => {
  assertTabOpen(actor, "lessons");
  return { groups: await listRoomLessons(roomId, actor.kind === "instructor") };
});
