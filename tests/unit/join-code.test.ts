import { describe, expect, it } from "vitest";

import { generateJoinCode, isValidJoinCode, withUniqueJoinCode } from "@/lib/rooms/join-code";

describe("참여코드", () => {
  it("항상 숫자 6자리 (앞자리 0 포함)", () => {
    for (let i = 0; i < 5000; i++) {
      const c = generateJoinCode();
      expect(c).toMatch(/^\d{6}$/);
      expect(isValidJoinCode(c)).toBe(true);
    }
  });

  it("형식 검사", () => {
    expect(isValidJoinCode("012345")).toBe(true);
    expect(isValidJoinCode("12345")).toBe(false);
    expect(isValidJoinCode("12345a")).toBe(false);
  });

  it("중복이면 다시 만들어 시도한다", async () => {
    const tried: string[] = [];
    const value = await withUniqueJoinCode(async (code) => {
      tried.push(code);
      return tried.length < 3 ? { ok: false } : { ok: true, value: code };
    });
    expect(tried).toHaveLength(3);
    expect(value).toBe(tried[2]);
  });

  it("계속 실패하면 친절한 오류", async () => {
    await expect(withUniqueJoinCode(async () => ({ ok: false }), 3)).rejects.toThrow("참여코드");
  });
});
