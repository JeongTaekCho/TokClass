import { randomInt } from "node:crypto";

/** 6자리 숫자 참여코드 (000000 ~ 999999) */
export function generateJoinCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function isValidJoinCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * 충돌이 없을 때까지 코드를 만들어 시도해요. `tryInsert`가 false를 돌려주면 (unique 위반) 다시 시도합니다.
 */
export async function withUniqueJoinCode<T>(
  tryInsert: (code: string) => Promise<{ ok: true; value: T } | { ok: false }>,
  maxTries = 12,
): Promise<T> {
  for (let i = 0; i < maxTries; i++) {
    const result = await tryInsert(generateJoinCode());
    if (result.ok) return result.value;
  }
  throw new Error("참여코드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
}
