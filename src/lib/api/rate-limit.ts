import "server-only";

import { createHash } from "node:crypto";

import { ApiError } from "@/lib/api/errors";
import type { Actor } from "@/lib/auth/actor";
import { db } from "@/lib/supabase/admin";

/*
 * 요청 횟수 제한 (Vercel 서버리스라 인스턴스 메모리 대신 DB를 써요)
 * - hitLimit: rate_limits 카운터를 원자적으로 올려요. 행이 남지 않는 토글(반응·공감)과 실패 횟수까지 같은 방식으로 셀 수 있어요.
 * - DB 오류가 나면 막지 않고 통과시켜요(fail-open). 수업이 멈추는 것보다 낫기 때문이에요.
 */

export const tooMany = (retryAfterSec: number, message = `잠시 후에 다시 해 주세요. (${retryAfterSec}초)`) =>
  new ApiError(429, message, "rate_limited", { retryAfterSec });

export function hashed(kind: string, value: string) {
  return `${kind}:${createHash("sha256").update(value || "unknown").digest("hex").slice(0, 24)}`;
}

let warned = false;
function warnOnce(e: unknown) {
  if (warned) return;
  warned = true;
  console.error("[rate-limit] 확인 실패, 제한 없이 진행해요", e);
}

/** 한 번 세고, 한도를 넘었으면 남은 초(아니면 0)를 돌려줘요. */
export async function hitLimit(key: string, windowSec: number, max: number): Promise<number> {
  const { data, error } = await db().rpc("hit_rate_limit", { p_key: key, p_window_sec: windowSec, p_max: max });
  if (error) {
    warnOnce(error.message);
    return 0;
  }
  // 오래된 카운터는 가끔 정리해요.
  if (Math.random() < 0.01) void db().from("rate_limits").delete().lt("window_start", new Date(Date.now() - 86_400_000).toISOString());
  return typeof data === "number" ? data : 0;
}

/** 세지 않고 지금 막혀 있는지만 봐요. 실패만 세는 제한(참여코드 대입 방지)에서 요청 전에 확인할 때 써요. */
export async function peekLimit(key: string, windowSec: number, max: number): Promise<number> {
  const { data, error } = await db().from("rate_limits").select("window_start, hits").eq("key", key).maybeSingle();
  if (error) {
    warnOnce(error.message);
    return 0;
  }
  if (!data || data.hits <= max) return 0;
  const end = new Date(data.window_start).getTime() + windowSec * 1000;
  return Math.max(0, Math.ceil((end - Date.now()) / 1000));
}

export async function assertHitLimit(key: string, windowSec: number, max: number, message?: string) {
  const wait = await hitLimit(key, windowSec, max);
  if (wait > 0) throw tooMany(wait, message);
}

/** 수강생이 같은 동작을 너무 자주 하면 429 (강사는 제한하지 않아요). 이름 예: "qa", "dm" */
export async function limitParticipant(actor: Actor, action: string, windowSec: number, max: number) {
  if (actor.kind !== "participant") return;
  await assertHitLimit(`${action}:${actor.participant.id}`, windowSec, max);
}
