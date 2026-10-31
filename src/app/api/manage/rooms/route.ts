import { instructorHandler } from "@/lib/api/handler";
import { listManageRooms } from "@/lib/manage/list";

/** 수강생 관리: 내 방 목록 (참여코드·정원·입장 마감·조) */
export const GET = instructorHandler({}, async ({ access }) => {
  return { rooms: await listManageRooms(access.user.id) };
});
