import "server-only";

import { readParticipantSession } from "@/lib/auth/participant-session";
import { normalizeSettings, type RoomSettings } from "@/lib/rooms/templates";
import { db } from "@/lib/supabase/admin";
import { getInstructor } from "@/lib/supabase/server";
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
  const room = roomRow ?? (await loadRoom(roomId));
  if (!room) return null;
  const settings = normalizeSettings(room.settings);

  const asInstructor = async (): Promise<Actor | null> => {
    const user = await getInstructor();
    if (user && user.id === room.owner_id) return { kind: "instructor", userId: user.id, room, settings };
    return null;
  };
  const asParticipant = async (): Promise<Actor | null> => {
    const participant = await loadParticipantFromSession(roomId);
    return participant ? { kind: "participant", participant, room, settings } : null;
  };

  if (prefer === "instructor") return (await asInstructor()) ?? (await asParticipant());
  return (await asParticipant()) ?? (await asInstructor());
}

export function actorNickname(actor: Actor) {
  return actor.kind === "instructor" ? "강사" : actor.participant.nickname;
}
