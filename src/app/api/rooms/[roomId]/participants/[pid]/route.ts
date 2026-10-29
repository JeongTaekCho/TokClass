import { z } from "zod";

import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { generatePassword, hmacPassword } from "@/lib/auth/password";
import { serverEnv } from "@/lib/env";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";

const schema = z.discriminatedUnion("action", [z.object({ action: z.literal("reissue") }), z.object({ action: z.literal("kick") }), z.object({ action: z.literal("restore") })]);

/**
 * 참여자 관리 (강사)
 * - reissue: 새 비밀번호 발급 → 강사 화면에 1회 표시, 기존 비밀번호·세션 즉시 무효
 * - kick: 강퇴 (세션 무효, 비밀번호로도 다시 못 들어와요)
 * - restore: 강퇴 취소
 */
export const POST = roomHandler({ roles: ["instructor"], body: schema, allowEnded: true }, async ({ roomId, params, body }) => {
  if (!isUuid(params.pid)) throw notFound();
  const p = must(await db().from("participants").select("id, session_version, kicked").eq("id", params.pid).eq("room_id", roomId).maybeSingle()) as {
    id: string;
    session_version: number;
    kicked: boolean;
  } | null;
  if (!p) throw notFound("참여자를 찾을 수 없어요.");

  if (body.action === "reissue") {
    for (let i = 0; i < 8; i++) {
      const password = generatePassword();
      const { error } = await db()
        .from("participants")
        .update({ password_hmac: hmacPassword(serverEnv.passwordSecret, roomId, password), session_version: p.session_version + 1 })
        .eq("id", p.id);
      if (error?.code === "23505") continue;
      if (error) throw error;
      await broadcast(roomId, "participant.session", { participantId: p.id, reason: "reissued" });
      return { password };
    }
    throw new ApiError(500, "비밀번호를 만들지 못했어요. 다시 시도해 주세요.");
  }
  if (body.action === "kick") {
    must(await db().from("participants").update({ kicked: true, session_version: p.session_version + 1, group_id: null }).eq("id", p.id));
    await db().from("understanding_current").delete().eq("participant_id", p.id);
    await db().from("help_requests").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("participant_id", p.id).eq("status", "open");
    await broadcast(roomId, "participant.session", { participantId: p.id, reason: "kicked" });
    return { ok: true };
  }
  must(await db().from("participants").update({ kicked: false }).eq("id", p.id));
  return { ok: true };
});
