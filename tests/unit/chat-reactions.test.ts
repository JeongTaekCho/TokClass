import { describe, expect, it } from "vitest";

import { groupReactions, INSTRUCTOR_REACTOR, toggleReaction } from "@/lib/chat/reactions";

describe("채팅 반응 묶기", () => {
  it("메시지별로 이모지를 처음 눌린 순서대로 세고, 강사는 instructor 키로 담는다", () => {
    const map = groupReactions([
      { message_id: "m1", participant_id: "p2", emoji: "❤️", created_at: "2026-11-01T10:00:02Z", participant: { nickname: "준호" } },
      { message_id: "m1", participant_id: "p1", emoji: "👍", created_at: "2026-11-01T10:00:01Z", participant: { nickname: "민지" } },
      { message_id: "m1", participant_id: null, emoji: "👍", created_at: "2026-11-01T10:00:03Z" },
      { message_id: "m2", participant_id: "p1", emoji: "😂", created_at: "2026-11-01T10:00:04Z", participant: { nickname: "민지" } },
    ]);
    expect(map.get("m1")).toEqual([
      { emoji: "👍", count: 2, reactors: ["p1", INSTRUCTOR_REACTOR], names: ["민지", "강사"] },
      { emoji: "❤️", count: 1, reactors: ["p2"], names: ["준호"] },
    ]);
    expect(map.get("m2")?.[0]?.count).toBe(1);
  });
});

describe("내 반응 뒤집기", () => {
  const me = { key: "p1", name: "민지" };

  it("없던 이모지는 맨 뒤에 1로 추가한다", () => {
    expect(toggleReaction([], "👍", me)).toEqual([{ emoji: "👍", count: 1, reactors: ["p1"], names: ["민지"] }]);
  });

  it("남이 누른 이모지에 더하고, 다시 누르면 빠진다", () => {
    const start = [{ emoji: "👍", count: 1, reactors: ["p2"], names: ["준호"] }];
    const added = toggleReaction(start, "👍", me);
    expect(added[0]).toMatchObject({ count: 2, reactors: ["p2", "p1"] });
    expect(toggleReaction(added, "👍", me)).toEqual(start);
  });

  it("마지막 한 명이 취소하면 칩이 사라진다", () => {
    expect(toggleReaction([{ emoji: "❤️", count: 1, reactors: ["p1"], names: ["민지"] }], "❤️", me)).toEqual([]);
  });
});
