import "server-only";

import { SignJWT } from "jose";

import { serverEnv } from "@/lib/env";

export const REALTIME_TOKEN_TTL_SEC = 10 * 60;

/**
 * 수강생용 Supabase 호환 JWT (Realtime 구독 전용, 10분).
 * role=authenticated 이지만 tk_kind=participant 라서 일반 테이블 RLS는 아무것도 허용하지 않아요.
 * realtime.messages 정책(can_join_room_topic)이 tk_room / tk_sv 를 확인합니다.
 */
export async function signRealtimeToken(input: { participantId: string; roomId: string; sessionVersion: number }) {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    role: "authenticated",
    tk_kind: "participant",
    tk_room: input.roomId,
    tk_sv: input.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.participantId)
    .setAudience("authenticated")
    .setIssuedAt(now)
    .setExpirationTime(now + REALTIME_TOKEN_TTL_SEC)
    .sign(new TextEncoder().encode(serverEnv.supabaseJwtSecret));
  return { token, expiresAt: (now + REALTIME_TOKEN_TTL_SEC) * 1000 };
}
