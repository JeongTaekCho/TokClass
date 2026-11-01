import "server-only";

import { notFound, redirect } from "next/navigation";

import { loadParticipantFromSession } from "@/lib/auth/actor";
import { toPublicRoom } from "@/lib/rooms/public";
import { findRoomByCode, isRoomOwnerBlocked } from "@/lib/rooms/lookup";
import type { Me } from "@/lib/types";

/** 수강생 페이지용: 쿠키 세션 확인, 없으면 입장 화면으로 */
export async function requireParticipant(code: string) {
  if (!/^\d{6}$/.test(code)) notFound();
  const room = await findRoomByCode(code, { allowEnded: true });
  if (!room) redirect(`/join/${code}`);
  // 강사 상태와 내 세션 확인은 서로 기다릴 필요가 없어서 동시에 해요.
  const [blocked, participant] = await Promise.all([isRoomOwnerBlocked(room.owner_id), loadParticipantFromSession(room.id)]);
  if (blocked || !participant) redirect(`/join/${code}`);
  const me: Me = { kind: "participant", id: participant.id, nickname: participant.nickname, groupId: participant.group_id };
  return { room, publicRoom: toPublicRoom(room), participant, me };
}
