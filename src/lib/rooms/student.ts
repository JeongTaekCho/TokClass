import "server-only";

import { notFound, redirect } from "next/navigation";

import { loadParticipantFromSession } from "@/lib/auth/actor";
import { toPublicRoom } from "@/lib/rooms/public";
import { findRoomByCode } from "@/lib/rooms/lookup";
import type { Me } from "@/lib/types";

/** 수강생 페이지용: 쿠키 세션 확인, 없으면 입장 화면으로 */
export async function requireParticipant(code: string) {
  if (!/^\d{6}$/.test(code)) notFound();
  const room = await findRoomByCode(code, { allowEnded: true });
  if (!room) redirect(`/join/${code}`);
  const participant = await loadParticipantFromSession(room.id);
  if (!participant) redirect(`/join/${code}`);
  const me: Me = { kind: "participant", id: participant.id, nickname: participant.nickname, groupId: participant.group_id };
  return { room, publicRoom: toPublicRoom(room), participant, me };
}
