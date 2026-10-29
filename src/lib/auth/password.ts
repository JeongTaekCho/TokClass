import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/** 헷갈리는 0/O, 1/I/L을 뺀 대문자+숫자 */
export const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const PASSWORD_LENGTH = 6;

/** crypto 기반 안전한 난수로 임시 비밀번호를 만들어요. */
export function generatePassword(length = PASSWORD_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

/** 사용자가 입력한 비밀번호를 비교 가능한 형태로 (공백·하이픈 제거, 대문자) */
export function normalizePassword(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidPasswordFormat(password: string): boolean {
  if (password.length !== PASSWORD_LENGTH) return false;
  for (const ch of password) {
    if (!PASSWORD_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/**
 * HMAC-SHA256(secret, roomId + ":" + password)
 * 비밀번호만으로 참여자를 찾아야 해서, 솔트 대신 방 ID를 섞은 결정적 HMAC을 저장해요.
 */
export function hmacPassword(secret: string, roomId: string, password: string): string {
  if (!secret || secret.length < 16) {
    throw new Error("PARTICIPANT_PASSWORD_SECRET은 16자 이상이어야 해요.");
  }
  return createHmac("sha256", secret).update(`${roomId}:${password}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
