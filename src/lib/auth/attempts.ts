import "server-only";

import { createHash } from "node:crypto";

import { checkLock, registerFailure, remainingAttempts, type AttemptState } from "@/lib/auth/rate-limit";
import { db } from "@/lib/supabase/admin";

function hashKey(kind: string, value: string) {
  return `${kind}:${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;
}

/** 같은 방에서 IP 기준·기기 기준 두 키로 시도를 기록해요. */
export function attemptKeys(ip: string, deviceId: string) {
  return [hashKey("ip", ip || "unknown"), hashKey("dev", deviceId)];
}

type Row = { key: string; failed_count: number; locked_until: string | null };

async function load(roomId: string, keys: string[]) {
  const { data, error } = await db().from("login_attempts").select("key, failed_count, locked_until").eq("room_id", roomId).in("key", keys);
  if (error) throw error;
  const map = new Map<string, AttemptState>();
  for (const r of (data ?? []) as Row[]) {
    map.set(r.key, { failedCount: r.failed_count, lockedUntil: r.locked_until ? new Date(r.locked_until) : null });
  }
  return map;
}

/** 잠겨 있으면 남은 초를, 아니면 0 */
export async function lockedFor(roomId: string, keys: string[], now = new Date()) {
  const states = await load(roomId, keys);
  let wait = 0;
  for (const k of keys) wait = Math.max(wait, checkLock(states.get(k) ?? null, now).retryAfterSec);
  return wait;
}

/** 실패를 기록하고 (잠금 초, 남은 시도) 를 돌려줘요. */
export async function recordFailure(roomId: string, keys: string[], now = new Date()) {
  const states = await load(roomId, keys);
  let wait = 0;
  let remaining = Infinity;
  const rows = keys.map((k) => {
    const next = registerFailure(states.get(k) ?? null, now);
    wait = Math.max(wait, checkLock(next, now).retryAfterSec);
    remaining = Math.min(remaining, remainingAttempts(next));
    return {
      room_id: roomId,
      key: k,
      failed_count: next.failedCount,
      locked_until: next.lockedUntil?.toISOString() ?? null,
      updated_at: now.toISOString(),
    };
  });
  const { error } = await db().from("login_attempts").upsert(rows, { onConflict: "room_id,key" });
  if (error) throw error;
  return { retryAfterSec: wait, remaining: wait > 0 ? 0 : remaining };
}

export async function clearAttempts(roomId: string, keys: string[]) {
  await db().from("login_attempts").delete().eq("room_id", roomId).in("key", keys);
}

export function clientIp(headers: Headers) {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
