import { jwtVerify } from "jose";
import { z } from "zod";

import { apiHandler, must } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { setParticipantSessionCookie } from "@/lib/auth/participant-session";
import { serverEnv } from "@/lib/env";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";

const schema = z.object({ ticket: z.string().min(10).max(2000), remember: z.boolean().default(true) });

/** 비밀번호 확인 뒤 실제 입장: session_version을 올려 이전 기기 연결을 끊어요 (1인 1접속). */
export const POST = apiHandler({ body: schema }, async ({ body }) => {
  let pid: string;
  let rid: string;
  try {
    const { payload } = await jwtVerify(body.ticket, new TextEncoder().encode(serverEnv.sessionSecret), { audience: "tokclass-enter", algorithms: ["HS256"] });
    pid = String(payload.pid);
    rid = String(payload.rid);
  } catch {
    throw new ApiError(401, "확인 시간이 지났어요. 비밀번호를 다시 입력해 주세요.", "ticket_expired");
  }

  const { data: current } = await db().from("participants").select("session_version, kicked").eq("id", pid).eq("room_id", rid).maybeSingle();
  if (!current || current.kicked) throw new ApiError(403, "입장할 수 없어요. 강사님께 문의해 주세요.");

  const row = must(
    await db()
      .from("participants")
      .update({ session_version: current.session_version + 1, last_active_at: new Date().toISOString() })
      .eq("id", pid)
      .select("id, session_version")
      .single(),
  ) as { id: string; session_version: number };

  await setParticipantSessionCookie({ pid: row.id, rid, sv: row.session_version }, body.remember);
  await broadcast(rid, "participant.session", { participantId: row.id, reason: "replaced" });
  return { roomId: rid };
});
