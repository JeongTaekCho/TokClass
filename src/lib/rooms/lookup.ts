import "server-only";

import { cookies, headers } from "next/headers";

import { blocksParticipants, type InstructorStatus } from "@/lib/admin/rules";
import { ApiError } from "@/lib/api/errors";
import { hashed, hitLimit, peekLimit } from "@/lib/api/rate-limit";
import { clientIp } from "@/lib/auth/attempts";
import { DEVICE_COOKIE, readParticipantSession } from "@/lib/auth/participant-session";
import { db } from "@/lib/supabase/admin";
import type { RoomRow } from "@/lib/types";

/**
 * 참여코드로 방 찾기. 진행 중인 방끼리만 코드가 유일해서, 종료된 방은 같은 코드가 여러 개일 수 있어요.
 * 1) 이 브라우저에 세션이 있는 방 → 2) 진행 중인 방 → 3) (allowEnded) 가장 최근에 끝난 방
 */
export async function findRoomByCode(code: string, opts: { allowEnded?: boolean } = {}): Promise<RoomRow | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const { data, error } = await db().from("rooms").select("*").eq("join_code", code).order("created_at", { ascending: false }).limit(10);
  if (error) throw error;
  const rooms = (data ?? []) as RoomRow[];
  for (const r of rooms) {
    if (await readParticipantSession(r.id)) return r;
  }
  const active = rooms.find((r) => r.status === "active");
  if (active) return active;
  return opts.allowEnded ? (rooms[0] ?? null) : null;
}

/*
 * 참여코드 대입 방지: 없는 코드를 넣은 "실패"만 세요.
 * 한 강의실 학생들이 같은 공인 IP(NAT)를 써도 맞는 코드로 들어오는 건 막히지 않아요.
 */
const MISS_WINDOW_SEC = 10 * 60;
const MISS_MAX_PER_IP = 30;
const MISS_MAX_PER_DEVICE = 10;
export const CODE_LOCKED_MESSAGE = "시도가 너무 많아요. 10분 뒤에 다시 해 보거나 강사님께 코드를 확인해 주세요.";

async function missKeys() {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const keys: [string, number][] = [[hashed("code-miss:ip", clientIp(h)), MISS_MAX_PER_IP]];
  const device = c.get(DEVICE_COOKIE)?.value;
  if (device) keys.push([hashed("code-miss:dev", device), MISS_MAX_PER_DEVICE]);
  return keys;
}

/** 참여코드 조회가 잠겨 있으면 남은 초, 아니면 0 */
export async function codeLookupLockedFor() {
  const keys = await missKeys();
  const waits = await Promise.all(keys.map(([k, max]) => peekLimit(k, MISS_WINDOW_SEC, max)));
  return Math.max(0, ...waits);
}

/**
 * 공개 입장 화면·API용 참여코드 조회. 잠겨 있으면 429를 던지고, 찾지 못하면 실패로 세요.
 * (이미 들어온 수강생의 수업 화면은 세션으로 확인하니 findRoomByCode를 그대로 써요.)
 */
export async function findRoomByCodeGuarded(code: string, opts: { allowEnded?: boolean } = {}): Promise<RoomRow | null> {
  const wait = await codeLookupLockedFor();
  if (wait > 0) throw new ApiError(429, CODE_LOCKED_MESSAGE, "code_locked", { retryAfterSec: wait });
  const room = await findRoomByCode(code, opts);
  if (!room) {
    const keys = await missKeys();
    await Promise.all(keys.map(([k, max]) => hitLimit(k, MISS_WINDOW_SEC, max)));
  }
  return room;
}

/** 방 주인이 정지·거절된 강사면 수강생이 들어올 수 없어요. 기록은 그대로 둬요. */
export async function isRoomOwnerBlocked(ownerId: string): Promise<boolean> {
  const { data, error } = await db().from("instructor_profiles").select("status").eq("user_id", ownerId).maybeSingle();
  if (error) throw error;
  return blocksParticipants((data?.status as InstructorStatus | undefined) ?? null);
}
