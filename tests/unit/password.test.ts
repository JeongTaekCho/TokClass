import { describe, expect, it } from "vitest";

import { generatePassword, hmacPassword, isValidPasswordFormat, normalizePassword, PASSWORD_ALPHABET, safeEqualHex } from "@/lib/auth/password";

const SECRET = "test-secret-at-least-16-chars";

describe("임시 비밀번호 생성", () => {
  it("영문 대문자+숫자 6자리이고 헷갈리는 0/O/1/I/L이 없다", () => {
    for (let i = 0; i < 2000; i++) {
      const pw = generatePassword();
      expect(pw).toMatch(/^[A-Z2-9]{6}$/);
      expect(pw).not.toMatch(/[01OIL]/);
      expect(isValidPasswordFormat(pw)).toBe(true);
    }
  });

  it("알파벳에 혼동 문자가 없다", () => {
    for (const ch of "01OIL") expect(PASSWORD_ALPHABET).not.toContain(ch);
    expect(new Set(PASSWORD_ALPHABET).size).toBe(PASSWORD_ALPHABET.length);
  });

  it("충분히 무작위다 (1000개 중 중복이 거의 없음)", () => {
    const set = new Set(Array.from({ length: 1000 }, () => generatePassword()));
    expect(set.size).toBeGreaterThan(990);
  });

  it("입력값을 정규화하고 형식을 검사한다", () => {
    expect(normalizePassword(" k7m-2p9 ")).toBe("K7M2P9");
    expect(isValidPasswordFormat("K7M2P9")).toBe(true);
    expect(isValidPasswordFormat("K7M2P")).toBe(false);
    expect(isValidPasswordFormat("K7M2P0")).toBe(false); // 0 제외
    expect(isValidPasswordFormat("ABCDEI")).toBe(false); // I 제외
  });
});

describe("HMAC 저장", () => {
  const room = "22222222-2222-4222-8222-222222222222";

  it("같은 입력이면 같은 값 (비밀번호만으로 찾을 수 있음)", () => {
    expect(hmacPassword(SECRET, room, "K7M2P9")).toBe(hmacPassword(SECRET, room, "K7M2P9"));
  });

  it("방이 다르거나 비밀키가 다르면 값이 달라진다", () => {
    const a = hmacPassword(SECRET, room, "K7M2P9");
    expect(hmacPassword(SECRET, "33333333-2222-4222-8222-222222222222", "K7M2P9")).not.toBe(a);
    expect(hmacPassword(`${SECRET}x`, room, "K7M2P9")).not.toBe(a);
    expect(a).not.toContain("K7M2P9");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("seed.sql의 pgcrypto HMAC과 같은 결과", () => {
    // supabase/seed.sql: encode(hmac(room || ':' || 'TKCP23', secret, 'sha256'), 'hex')
    expect(hmacPassword("tokclass-local-dev-password-secret", room, "TKCP23")).toBe("83ab3913216a661ec0c196001330dc1266525d2882ae44eeabd369caf334a197");
  });

  it("짧은 비밀키는 거부한다", () => {
    expect(() => hmacPassword("short", room, "K7M2P9")).toThrow();
  });

  it("상수 시간 비교", () => {
    const a = hmacPassword(SECRET, room, "K7M2P9");
    expect(safeEqualHex(a, a)).toBe(true);
    expect(safeEqualHex(a, hmacPassword(SECRET, room, "K7M2P8"))).toBe(false);
  });
});
