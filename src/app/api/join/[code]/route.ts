import { apiHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { loadParticipantFromSession } from "@/lib/auth/actor";
import { findRoomByCode } from "@/lib/rooms/lookup";
import { db } from "@/lib/supabase/admin";

/** 입장 화면용 방 정보 (공개해도 되는 것만) */
export const GET = apiHandler({}, async ({ params }) => {
  const room = await findRoomByCode(params.code ?? "", { allowEnded: true });
  if (!room) throw notFound("참여코드에 맞는 수업을 찾지 못했어요. 숫자 6자리를 다시 확인해 주세요.");
  const me = await loadParticipantFromSession(room.id);
  const { count } = await db().from("participants").select("id", { count: "exact", head: true }).eq("room_id", room.id).eq("kicked", false);
  return {
    room: {
      id: room.id,
      title: room.title,
      status: room.status,
      locked: room.locked,
      full: (count ?? 0) >= room.capacity,
    },
    resume: me ? { nickname: me.nickname } : null,
  };
});
