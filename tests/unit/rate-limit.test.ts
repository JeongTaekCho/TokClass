import { describe, expect, it } from "vitest";

import { checkLock, LOCK_DURATION_MS, MAX_FAILED_ATTEMPTS, MAX_FAILED_ATTEMPTS_PER_IP, registerFailure, remainingAttempts, type AttemptState } from "@/lib/auth/rate-limit";

const t0 = new Date("2026-10-29T10:00:00Z");
const at = (ms: number) => new Date(t0.getTime() + ms);

describe("비밀번호 시도 제한", () => {
  it("5회 연속 실패하면 1분 잠긴다", () => {
    let s: AttemptState | null = null;
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
      s = registerFailure(s, at(i * 1000));
      expect(checkLock(s, at(i * 1000)).locked).toBe(false);
      expect(remainingAttempts(s)).toBe(MAX_FAILED_ATTEMPTS - i);
    }
    s = registerFailure(s, at(5000));
    const lock = checkLock(s, at(5000));
    expect(lock.locked).toBe(true);
    expect(lock.retryAfterSec).toBe(60);
    expect(s.lockedUntil!.getTime()).toBe(at(5000).getTime() + LOCK_DURATION_MS);
  });

  it("1분이 지나면 풀리고 다시 5번 시도할 수 있다", () => {
    let s: AttemptState | null = null;
    for (let i = 0; i < 5; i++) s = registerFailure(s, at(0));
    expect(checkLock(s, at(59_000)).locked).toBe(true);
    expect(checkLock(s, at(60_001)).locked).toBe(false);
    s = registerFailure(s, at(61_000));
    expect(s.failedCount).toBe(1);
    expect(s.lockedUntil).toBeNull();
  });

  it("남은 대기 시간을 올림해서 알려준다", () => {
    const s: AttemptState = { failedCount: 0, lockedUntil: at(30_500) };
    expect(checkLock(s, at(0)).retryAfterSec).toBe(31);
  });

  it("IP 기준은 더 넉넉한 한도를 쓴다", () => {
    let s: AttemptState | null = null;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS_PER_IP - 1; i++) s = registerFailure(s, at(0), MAX_FAILED_ATTEMPTS_PER_IP);
    expect(checkLock(s, at(0)).locked).toBe(false);
    s = registerFailure(s, at(0), MAX_FAILED_ATTEMPTS_PER_IP);
    expect(checkLock(s, at(0)).locked).toBe(true);
  });

  it("기록이 없으면 잠기지 않는다", () => {
    expect(checkLock(null, t0)).toEqual({ locked: false, retryAfterSec: 0 });
  });
});
