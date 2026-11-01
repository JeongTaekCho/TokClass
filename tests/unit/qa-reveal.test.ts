import { describe, expect, it } from "vitest";

import { canRevealAnonymousAuthor, normalizeSettings } from "@/lib/rooms/templates";

describe("익명 질문 작성자 확인 (소급 공개 안 함)", () => {
  const since = "2026-11-01T10:00:00.000Z";
  const on = { qaRevealAuthor: true, qaRevealSince: since };

  it("켠 뒤에 올라온 질문만 작성자를 보여준다", () => {
    expect(canRevealAnonymousAuthor(on, "2026-11-01T10:00:01.000Z")).toBe(true);
    expect(canRevealAnonymousAuthor(on, "2026-11-01T09:59:59.000Z")).toBe(false);
  });

  it("꺼져 있거나 켠 시각을 모르면(이전 버전 설정) 보여주지 않는다", () => {
    expect(canRevealAnonymousAuthor({ qaRevealAuthor: false, qaRevealSince: since }, "2026-11-02T00:00:00.000Z")).toBe(false);
    expect(canRevealAnonymousAuthor({ qaRevealAuthor: true, qaRevealSince: null }, "2026-11-02T00:00:00.000Z")).toBe(false);
  });

  it("설정을 읽을 때 꺼져 있으면 켠 시각을 버린다", () => {
    expect(normalizeSettings({ qaRevealAuthor: false, qaRevealSince: since }).qaRevealSince).toBeNull();
    expect(normalizeSettings({ qaRevealAuthor: true, qaRevealSince: since }).qaRevealSince).toBe(since);
    expect(normalizeSettings({ qaRevealAuthor: true, qaRevealSince: "nope" }).qaRevealSince).toBeNull();
  });
});
