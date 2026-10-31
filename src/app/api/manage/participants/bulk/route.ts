import { z } from "zod";

import { instructorHandler } from "@/lib/api/handler";
import { kickParticipants, loadOwnedParticipants, logoutParticipants } from "@/lib/manage/participants";

const schema = z.object({
  action: z.enum(["kick", "logout"]),
  participantIds: z.array(z.string().uuid()).min(1, "수강생을 골라 주세요.").max(500, "한 번에 500명까지 할 수 있어요."),
});

/** 일괄 강퇴 / 강제 로그아웃. 다른 강사 방의 수강생은 무시돼요. */
export const POST = instructorHandler({ body: schema }, async ({ body, access }) => {
  const list = await loadOwnedParticipants(access.user.id, [...new Set(body.participantIds)]);
  const done = body.action === "kick" ? await kickParticipants(list) : await logoutParticipants(list);
  return { done, skipped: body.participantIds.length - done };
});
