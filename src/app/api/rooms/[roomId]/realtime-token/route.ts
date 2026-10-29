import { roomHandler } from "@/lib/api/handler";
import { signRealtimeToken } from "@/lib/auth/realtime-token";

/** 수강생 Realtime 구독용 짧은 수명 JWT. 강퇴·재발급되면 여기서 거절돼 자연스럽게 끊겨요. */
export const GET = roomHandler({ roles: ["participant"], allowEnded: true }, async ({ actor }) => {
  if (actor.kind !== "participant") throw new Error("unreachable");
  return signRealtimeToken({
    participantId: actor.participant.id,
    roomId: actor.room.id,
    sessionVersion: actor.participant.session_version,
  });
});
