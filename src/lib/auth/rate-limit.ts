/** 비밀번호 시도 제한: 5회 연속 실패 시 1분 대기 */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 60_000;

export type AttemptState = {
  failedCount: number;
  lockedUntil: Date | null;
};

export const EMPTY_ATTEMPT: AttemptState = { failedCount: 0, lockedUntil: null };

/** 지금 잠겨 있는지와 남은 시간(초) */
export function checkLock(state: AttemptState | null, now: Date): { locked: boolean; retryAfterSec: number } {
  if (!state?.lockedUntil) return { locked: false, retryAfterSec: 0 };
  const remain = state.lockedUntil.getTime() - now.getTime();
  if (remain <= 0) return { locked: false, retryAfterSec: 0 };
  return { locked: true, retryAfterSec: Math.ceil(remain / 1000) };
}

/** 실패 1회를 반영한 다음 상태. 5회째 실패하면 1분 잠그고 카운트를 초기화해요. */
export function registerFailure(state: AttemptState | null, now: Date): AttemptState {
  const current = state ?? EMPTY_ATTEMPT;
  // 잠금이 풀린 뒤라면 새로 센다
  const expired = current.lockedUntil !== null && current.lockedUntil.getTime() <= now.getTime();
  const count = (expired ? 0 : current.failedCount) + 1;
  if (count >= MAX_FAILED_ATTEMPTS) {
    return { failedCount: 0, lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS) };
  }
  return { failedCount: count, lockedUntil: expired ? null : current.lockedUntil };
}

/** 남은 시도 횟수 (안내 문구용) */
export function remainingAttempts(state: AttemptState | null): number {
  return MAX_FAILED_ATTEMPTS - (state?.failedCount ?? 0);
}
