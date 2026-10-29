import { SignJWT } from "jose";

import { apiHandler } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { attemptKeys, clearAttempts, clientIp, lockedFor, recordFailure } from "@/lib/auth/attempts";
import { getOrCreateDeviceId } from "@/lib/auth/participant-session";
import { hmacPassword, isValidPasswordFormat, normalizePassword } from "@/lib/auth/password";
import { serverEnv } from "@/lib/env";
import { findRoomByCode } from "@/lib/rooms/lookup";
import { db } from "@/lib/supabase/admin";
import { joinPasswordSchema } from "@/lib/validation/join";

/**
 * 비밀번호 확인 → "○○님으로 들어갈게요" 확인용 닉네임과 짧은 입장 티켓을 돌려줘요.
 * 실제 입장(세션 발급)은 /api/join/enter 에서 티켓으로 합니다.
 */
export const POST = apiHandler({ body: joinPasswordSchema }, async ({ req, body }) => {
  const room = await findRoomByCode(body.code, { allowEnded: true });
  if (!room) throw notFound("참여코드에 맞는 수업을 찾지 못했어요.");

  const deviceId = await getOrCreateDeviceId();
  const keys = attemptKeys(clientIp(req.headers), deviceId);
  const wait = await lockedFor(room.id, keys);
  if (wait > 0) {
    throw new ApiError(429, `비밀번호를 여러 번 틀려서 잠시 막혔어요. ${wait}초 뒤에 다시 시도해 주세요.`, "locked", { retryAfterSec: wait });
  }

  const password = normalizePassword(body.password);
  const participant = isValidPasswordFormat(password)
    ? (
        await db()
          .from("participants")
          .select("id, nickname, kicked")
          .eq("room_id", room.id)
          .eq("password_hmac", hmacPassword(serverEnv.passwordSecret, room.id, password))
          .maybeSingle()
      ).data
    : null;

  if (!participant) {
    const { retryAfterSec, remaining } = await recordFailure(room.id, keys);
    if (retryAfterSec > 0) {
      throw new ApiError(429, `비밀번호를 여러 번 틀렸어요. ${retryAfterSec}초 뒤에 다시 시도해 주세요.`, "locked", { retryAfterSec });
    }
    throw new ApiError(401, `비밀번호가 맞지 않아요. (남은 시도 ${remaining}번)`, "wrong_password", { remaining });
  }
  if (participant.kicked) throw new ApiError(403, "이 수업에서 내보내진 계정이에요. 강사님께 문의해 주세요.", "kicked");

  await clearAttempts(room.id, keys);
  const ticket = await new SignJWT({ pid: participant.id, rid: room.id })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("tokclass-enter")
    .setIssuedAt()
    .setExpirationTime("3m")
    .sign(new TextEncoder().encode(serverEnv.sessionSecret));
  return { nickname: participant.nickname, ticket };
});
