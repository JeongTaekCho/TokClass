import "server-only";

import { readParticipantSession } from "@/lib/auth/participant-session";
import { normalizeSettings, type RoomSettings } from "@/lib/rooms/templates";
import { db } from "@/lib/supabase/admin";
import { getApprovedInstructor } from "@/lib/supabase/server";
import type { ParticipantRow, RoomRow } from "@/lib/types";

export type Actor =
  | { kind: "instructor"; userId: string; room: RoomRow; settings: RoomSettings }
  | { kind: "participant"; participant: ParticipantRow; room: RoomRow; settings: RoomSettings };

export type ActorKind = Actor["kind"];

export async function loadRoom(roomId: string): Promise<RoomRow | null> {
  const { data, error } = await db().from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (error) throw error;
  return data as RoomRow | null;
}

export async function loadParticipantFromSession(roomId: string): Promise<ParticipantRow | null> {
  const session = await readParticipantSession(roomId);
  if (!session) return null;
  const { data, error } = await db().from("participants").select("*").eq("id", session.pid).eq("room_id", roomId).maybeSingle();
  if (error) throw error;
  const p = data as ParticipantRow | null;
  if (!p || p.kicked || p.session_version !== session.sv) return null;
  return p;
}

/**
 * 요청자를 판별해요. 같은 브라우저에 강사 세션과 수강생 쿠키가 함께 있을 수 있어서
 * 화면에서 `x-tk-as` 헤더로 어떤 역할로 요청하는지 알려줍니다.
 */
export async function resolveActor(roomId: string, prefer: ActorKind | null, roomRow?: RoomRow | null): Promise<Actor | null> {
  // 방·우선 역할 확인을 동시에 시작해요 (DB 왕복을 차례로 기다리지 않게).
  const preferInstructor = prefer === "instructor";
  const [room, first] = await Promise.all([
    roomRow ? Promise.resolve(roomRow) : loadRoom(roomId),
    preferInstructor ? getApprovedInstructor() : loadParticipantFromSession(roomId),
  ]);
  if (!room) return null;
  const settings = normalizeSettings(room.settings);

  // 승인 전·거절·정지된 강사는 자기 방이어도 강사로 인정하지 않아요.
  const instructorActor = (access: Awaited<ReturnType<typeof getApprovedInstructor>>): Actor | null =>
    access && access.user.id === room.owner_id ? { kind: "instructor", userId: access.user.id, room, settings } : null;
  const participantActor = (participant: ParticipantRow | null): Actor | null => (participant ? { kind: "participant", participant, room, settings } : null);

  if (preferInstructor) {
    return instructorActor(first as Awaited<ReturnType<typeof getApprovedInstructor>>) ?? participantActor(await loadParticipantFromSession(roomId));
  }
  return participantActor(first as ParticipantRow | null) ?? instructorActor(await getApprovedInstructor());
}

export function actorNickname(actor: Actor) {
  return actor.kind === "instructor" ? "강사" : actor.participant.nickname;
}
