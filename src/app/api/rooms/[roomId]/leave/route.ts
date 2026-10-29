import { roomHandler } from "@/lib/api/handler";
import { clearParticipantSessionCookie } from "@/lib/auth/participant-session";

/** 이 기기에서 나가기 (쿠키 삭제). 비밀번호로 다시 들어올 수 있어요. */
export const POST = roomHandler({ roles: ["participant"], allowEnded: true }, async ({ roomId }) => {
  await clearParticipantSessionCookie(roomId);
  return { ok: true };
});
