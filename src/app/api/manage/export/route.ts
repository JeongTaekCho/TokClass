import { instructorHandler, isUuid } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { formatDateTimeFull } from "@/lib/format";
import { listManageParticipants, listManageRooms } from "@/lib/manage/list";
import { toCsv } from "@/lib/report/csv";

/** 수강생 목록 CSV (비밀번호·세션 정보는 넣지 않아요). ?roomId= 로 한 방만 */
export const GET = instructorHandler({}, async ({ req, access }) => {
  const sp = req.nextUrl.searchParams;
  const rooms = await listManageRooms(access.user.id);
  const roomId = sp.get("roomId");
  let target = rooms;
  if (roomId) {
    if (!isUuid(roomId)) throw notFound("방을 찾을 수 없어요.");
    target = rooms.filter((r) => r.id === roomId);
    if (target.length === 0) throw notFound("방을 찾을 수 없어요.");
  }
  const people = await listManageParticipants(target.map((r) => r.id));

  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const rows = people.map((p) => {
    const room = roomMap.get(p.roomId);
    return [
      room?.title ?? "",
      room?.joinCode ?? "",
      p.nickname,
      p.kicked ? "강퇴됨" : "참여 중",
      room?.groups.find((g) => g.id === p.groupId)?.name ?? "",
      formatDateTimeFull(p.createdAt),
      formatDateTimeFull(p.lastActiveAt),
    ];
  });
  const csv = toCsv(["방", "참여코드", "닉네임", "상태", "조", "참여일", "마지막 활동"], rows);
  const name = encodeURIComponent(`수강생_${target.length === 1 ? target[0]!.title : "전체"}.csv`);
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename*=UTF-8''${name}`, "Cache-Control": "no-store" },
  });
});
