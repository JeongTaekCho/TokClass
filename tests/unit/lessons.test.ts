import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { diffOrder, graphemeLength, LESSON_LIMITS, mergeCategories, moveItem, planRoomImport, splitPlaceholders } from "@/lib/lessons/rules";
import { defaultSettings, normalizeSettings, TAB_KEYS } from "@/lib/rooms/templates";
import { adminImportSchema, categoryAllowed, describeImportIssue, lessonCardSchema, lessonGroupCreateSchema } from "@/lib/validation/lessons";

const link = { kind: "link", name: "예시", icon: "🔗", color: "indigo", url: "https://example.com" };
const copy = { kind: "copy", name: "프롬프트", icon: "📋", color: "coral", body: "안녕 [이름]" };

describe("교안 카드 검증", () => {
  it("링크 카드는 http/https 주소가 있어야 한다", () => {
    expect(lessonCardSchema.safeParse(link).success).toBe(true);
    expect(lessonCardSchema.safeParse({ ...link, url: "http://example.com/a?b=1" }).success).toBe(true);
    expect(lessonCardSchema.safeParse({ ...link, url: undefined }).success).toBe(false);
    expect(lessonCardSchema.safeParse({ ...link, url: "" }).success).toBe(false);
  });

  it("javascript:·data:·상대 주소는 막는다", () => {
    for (const url of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,hi", "ftp://example.com", "/relative", "example.com"]) {
      expect(lessonCardSchema.safeParse({ ...link, url }).success, url).toBe(false);
    }
  });

  it("URL은 2,000자까지", () => {
    const base = "https://example.com/";
    expect(lessonCardSchema.safeParse({ ...link, url: base + "a".repeat(2000 - base.length) }).success).toBe(true);
    expect(lessonCardSchema.safeParse({ ...link, url: base + "a".repeat(2001 - base.length) }).success).toBe(false);
  });

  it("복사 카드는 본문이 있어야 하고 20,000자까지", () => {
    expect(lessonCardSchema.safeParse(copy).success).toBe(true);
    expect(lessonCardSchema.safeParse({ ...copy, body: "   " }).success).toBe(false);
    expect(lessonCardSchema.safeParse({ ...copy, body: "가".repeat(20000) }).success).toBe(true);
    expect(lessonCardSchema.safeParse({ ...copy, body: "가".repeat(20001) }).success).toBe(false);
  });

  it("종류에 맞지 않는 칸은 버린다", () => {
    const r = lessonCardSchema.parse({ ...copy, url: "javascript:alert(1)" });
    expect("url" in r).toBe(false);
  });

  it("앞뒤 공백을 정리하고 빈 선택 칸은 null/빈 문자열이 된다", () => {
    const r = lessonCardSchema.parse({ ...link, name: "  이름  ", org: "  ", description: null, url: "  https://example.com  " });
    expect(r.name).toBe("이름");
    expect(r.org).toBeNull();
    expect(r.description).toBe("");
    expect(r.kind === "link" && r.url).toBe("https://example.com");
  });

  it("이름·회사·설명 길이", () => {
    expect(lessonCardSchema.safeParse({ ...link, name: "" }).success).toBe(false);
    expect(lessonCardSchema.safeParse({ ...link, name: "가".repeat(80) }).success).toBe(true);
    expect(lessonCardSchema.safeParse({ ...link, name: "가".repeat(81) }).success).toBe(false);
    expect(lessonCardSchema.safeParse({ ...link, org: "가".repeat(41) }).success).toBe(false);
    expect(lessonCardSchema.safeParse({ ...link, description: "가".repeat(201) }).success).toBe(false);
  });

  it("아이콘은 1~4글자(이모지 하나는 한 글자)", () => {
    expect(graphemeLength("👨‍👩‍👧‍👦")).toBe(1);
    expect(lessonCardSchema.safeParse({ ...link, icon: "👨‍👩‍👧‍👦" }).success).toBe(true);
    expect(lessonCardSchema.safeParse({ ...link, icon: "ABCD" }).success).toBe(true);
    expect(lessonCardSchema.safeParse({ ...link, icon: "ABCDE" }).success).toBe(false);
    expect(lessonCardSchema.safeParse({ ...link, icon: " " }).success).toBe(false);
  });

  it("색은 팔레트 키만", () => {
    expect(lessonCardSchema.safeParse({ ...link, color: "pink" }).success).toBe(false);
    expect(lessonCardSchema.safeParse({ ...link, color: "#ff0000" }).success).toBe(false);
  });
});

describe("교안 분류", () => {
  it("카드 분류는 그룹 분류 중 하나여야 한다 (없으면 통과)", () => {
    expect(categoryAllowed(null, [])).toBe(true);
    expect(categoryAllowed("글쓰기", ["글쓰기", "코딩"])).toBe(true);
    expect(categoryAllowed("이미지", ["글쓰기"])).toBe(false);
  });

  it("그룹 분류는 중복을 없애고 20개, 각 30자까지", () => {
    expect(lessonGroupCreateSchema.parse({ title: "묶음", categories: [" a ", "a", "b"] }).categories).toEqual(["a", "b"]);
    expect(lessonGroupCreateSchema.safeParse({ title: "묶음", categories: Array.from({ length: 21 }, (_, i) => `c${i}`) }).success).toBe(false);
    expect(lessonGroupCreateSchema.safeParse({ title: "묶음", categories: ["가".repeat(31)] }).success).toBe(false);
    expect(lessonGroupCreateSchema.safeParse({ title: "가".repeat(61) }).success).toBe(false);
  });

  it("기존 그룹에 넣을 때 없는 분류는 자리가 있으면 덧붙이고, 없으면 비운다", () => {
    const m = mergeCategories(["a"], ["b", null, "a"]);
    expect(m.categories).toEqual(["a", "b"]);
    expect(m.cardCategory("b")).toBe("b");
    const full = Array.from({ length: LESSON_LIMITS.categories }, (_, i) => `c${i}`);
    const m2 = mergeCategories(full, ["new"]);
    expect(m2.categories).toHaveLength(LESSON_LIMITS.categories);
    expect(m2.cardCategory("new")).toBeNull();
  });
});

describe("가져오기 한도", () => {
  it("새 그룹이면 방 묶음 수를 본다", () => {
    expect(planRoomImport({ roomGroups: 49, roomCards: 0, adding: 3, newGroup: true }).ok).toBe(true);
    expect(planRoomImport({ roomGroups: 50, roomCards: 0, adding: 3, newGroup: true }).ok).toBe(false);
    // 기존 그룹에 넣으면 묶음 수는 늘지 않아요.
    expect(planRoomImport({ roomGroups: 50, roomCards: 0, adding: 3, newGroup: false, targetCards: 0 }).ok).toBe(true);
  });

  it("방 카드 수 500장을 넘으면 남은 수를 알려 준다", () => {
    expect(planRoomImport({ roomGroups: 1, roomCards: 497, adding: 3, newGroup: true }).ok).toBe(true);
    const r = planRoomImport({ roomGroups: 1, roomCards: 498, adding: 3, newGroup: true });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain("2장");
  });

  it("기존 그룹은 묶음당 300장을 넘으면 안 된다", () => {
    expect(planRoomImport({ roomGroups: 1, roomCards: 300, adding: 1, newGroup: false, targetCards: 299 }).ok).toBe(true);
    expect(planRoomImport({ roomGroups: 1, roomCards: 300, adding: 2, newGroup: false, targetCards: 299 }).ok).toBe(false);
  });

  it("넣을 카드가 없으면 막는다", () => {
    expect(planRoomImport({ roomGroups: 0, roomCards: 0, adding: 0, newGroup: true }).ok).toBe(false);
  });
});

describe("교안 탭 설정", () => {
  it("기존 방 설정에 lessons가 없으면 꺼진 상태로 맨 뒤에 붙인다", () => {
    const old = { tabs: [{ key: "slides", enabled: true }, { key: "chat", enabled: true }, { key: "qa", enabled: true }, { key: "board", enabled: true }, { key: "resources", enabled: true }], defaultTab: "slides" };
    const s = normalizeSettings(old);
    expect(s.tabs.map((t) => t.key)).toEqual([...TAB_KEYS.filter((k) => k !== "lessons"), "lessons"]);
    expect(s.tabs.find((t) => t.key === "lessons")?.enabled).toBe(false);
    expect(s.defaultTab).toBe("slides");
  });

  it("교안 탭을 첫 화면으로 둘 수 있다", () => {
    const s = normalizeSettings({ tabs: [{ key: "lessons", enabled: true }], defaultTab: "lessons" });
    expect(s.defaultTab).toBe("lessons");
  });

  it("기본 템플릿: 실습형·워크숍형은 켜고 강의형은 끈다", () => {
    const on = (t: "lecture" | "practice" | "workshop") => defaultSettings(t).tabs.find((x) => x.key === "lessons")?.enabled;
    expect(on("lecture")).toBe(false);
    expect(on("practice")).toBe(true);
    expect(on("workshop")).toBe(true);
  });
});

describe("교안 화면 도우미", () => {
  it("[ ... ] 부분을 바꿀 곳으로 나눈다", () => {
    expect(splitPlaceholders("안녕 [이름], 오늘은 [주제] 공부")).toEqual([
      { text: "안녕 ", placeholder: false },
      { text: "[이름]", placeholder: true },
      { text: ", 오늘은 ", placeholder: false },
      { text: "[주제]", placeholder: true },
      { text: " 공부", placeholder: false },
    ]);
    expect(splitPlaceholders("[]")).toEqual([{ text: "[]", placeholder: false }]);
  });

  it("바뀐 순서만 골라낸다", () => {
    const now = new Map([
      ["a", { parent: "g", position: 0 }],
      ["b", { parent: "g", position: 1 }],
      ["c", { parent: "g", position: 2 }],
    ]);
    expect(diffOrder([{ parent: "g", ids: ["b", "a", "c"] }], now)).toEqual([
      { id: "b", parent: "g", position: 0 },
      { id: "a", parent: "g", position: 1 },
    ]);
    expect(diffOrder([{ parent: "h", ids: ["c"] }], now)).toEqual([{ id: "c", parent: "h", position: 0 }]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
  });
});

describe("관리자 JSON 가져오기", () => {
  it("예시 파일(docs/lessons-sample.json)이 형식에 맞는다", () => {
    const raw = JSON.parse(readFileSync(new URL("../../docs/lessons-sample.json", import.meta.url), "utf8"));
    const r = adminImportSchema.parse(raw);
    expect(r.packs[0]!.cards.filter((c) => c.kind === "link")).toHaveLength(2);
    expect(r.packs[0]!.cards.filter((c) => c.kind === "copy")).toHaveLength(2);
  });

  it("오류 위치를 알려 준다", () => {
    const r = adminImportSchema.safeParse({ packs: [{ title: "A", cards: [] }, { title: "B", categories: ["x"], cards: [link, { ...link, url: "javascript:alert(1)" }] }] });
    expect(r.success).toBe(false);
    expect(!r.success && describeImportIssue(r.error)).toMatch(/^2번째 묶음 · 2번째 카드: /);
  });

  it("묶음에 없는 분류를 쓴 카드는 막는다", () => {
    const r = adminImportSchema.safeParse({ packs: [{ title: "A", categories: ["x"], cards: [{ ...link, category: "y" }] }] });
    expect(r.success).toBe(false);
  });
});
