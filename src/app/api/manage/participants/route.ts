import { instructorHandler, isUuid } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { listManageParticipants, MANAGE_LIMIT } from "@/lib/manage/list";
import { ownedRoomIds } from "@/lib/manage/participants";

/** 수강생 관리: 내 방들의 수강생 목록 (?roomId= 로 한 방만). 검색·상태 필터는 화면에서 해요. */
export const GET = instructorHandler({}, async ({ req, access }) => {
  const roomId = req.nextUrl.searchParams.get("roomId");
  const owned = await ownedRoomIds(access.user.id);
  let roomIds = owned;
  if (roomId) {
    if (!isUuid(roomId) || !owned.includes(roomId)) throw notFound("방을 찾을 수 없어요.");
    roomIds = [roomId];
  }
  const participants = await listManageParticipants(roomIds);
  return { participants, truncated: participants.length >= MANAGE_LIMIT };
});
