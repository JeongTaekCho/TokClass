import { z } from "zod";

import { isUuid, roomHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import {
  kickParticipants,
  loadRoomParticipant,
  logoutParticipants,
  moveParticipantGroup,
  reissuePassword,
  renameParticipant,
  restoreParticipant,
} from "@/lib/manage/participants";
import { nicknameSchema } from "@/lib/validation/join";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reissue") }),
  z.object({ action: z.literal("kick") }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("logout") }),
  z.object({ action: z.literal("move"), groupId: z.string().uuid().nullable() }),
  z.object({ action: z.literal("rename"), nickname: nicknameSchema }),
]);

/**
 * 참여자 관리 (강사, 본인 방만)
 * - reissue: 새 비밀번호 발급 → 강사 화면에 1회 표시, 기존 비밀번호·세션 즉시 무효
 * - kick: 강퇴 (세션 무효, 비밀번호로도 다시 못 들어와요)
 * - restore: 강퇴 취소
 * - logout: 강제 로그아웃 (session_version 증가, 비밀번호로 다시 들어올 수 있어요)
 * - move: 조 이동 (null이면 조 없음)
 * - rename: 닉네임 변경 (방 안에서 중복 금지)
 */
export const POST = roomHandler({ roles: ["instructor"], body: schema, allowEnded: true }, async ({ roomId, params, body }) => {
  if (!isUuid(params.pid)) throw notFound();
  const p = await loadRoomParticipant(roomId, params.pid);

  switch (body.action) {
    case "reissue":
      return { password: await reissuePassword(p) };
    case "kick":
      await kickParticipants([p]);
      break;
    case "restore":
      await restoreParticipant(p);
      break;
    case "logout":
      await logoutParticipants([p]);
      break;
    case "move":
      await moveParticipantGroup(p, body.groupId);
      break;
    case "rename":
      await renameParticipant(p, body.nickname);
      break;
  }
  return { ok: true };
});
