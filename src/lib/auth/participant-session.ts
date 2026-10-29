import "server-only";

import { randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

import { serverEnv } from "@/lib/env";

export const DEVICE_COOKIE = "tk_did";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30일

export function participantCookieName(roomId: string) {
  return `tk_p_${roomId.replace(/-/g, "")}`;
}

export type ParticipantSessionPayload = { pid: string; rid: string; sv: number };

function key() {
  return new TextEncoder().encode(serverEnv.sessionSecret);
}

export async function signParticipantSession(payload: ParticipantSessionPayload, remember: boolean) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "1d")
    .setAudience("tokclass-participant")
    .sign(key());
}

export async function verifyParticipantSession(token: string): Promise<ParticipantSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { audience: "tokclass-participant", algorithms: ["HS256"] });
    if (typeof payload.pid !== "string" || typeof payload.rid !== "string" || typeof payload.sv !== "number") return null;
    return { pid: payload.pid, rid: payload.rid, sv: payload.sv };
  } catch {
    return null;
  }
}

/** httpOnly·secure·sameSite 쿠키로 세션을 심어요. remember=false면 브라우저 세션 쿠키. */
export async function setParticipantSessionCookie(payload: ParticipantSessionPayload, remember: boolean) {
  const token = await signParticipantSession(payload, remember);
  const store = await cookies();
  store.set(participantCookieName(payload.rid), token, {
    httpOnly: true,
    secure: serverEnv.isProduction,
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: SESSION_MAX_AGE } : {}),
  });
}

export async function clearParticipantSessionCookie(roomId: string) {
  const store = await cookies();
  store.delete(participantCookieName(roomId));
}

export async function readParticipantSession(roomId: string): Promise<ParticipantSessionPayload | null> {
  const store = await cookies();
  const token = store.get(participantCookieName(roomId))?.value;
  if (!token) return null;
  const payload = await verifyParticipantSession(token);
  if (!payload || payload.rid !== roomId) return null;
  return payload;
}

/** 시도 제한에 쓰는 기기 식별자 (없으면 새로 발급) */
export async function getOrCreateDeviceId(): Promise<string> {
  const store = await cookies();
  let id = store.get(DEVICE_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = randomUUID();
    store.set(DEVICE_COOKIE, id, {
      httpOnly: true,
      secure: serverEnv.isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return id;
}
