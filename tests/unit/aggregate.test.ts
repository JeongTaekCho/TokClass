import { describe, expect, it } from "vitest";

import { bucketUnderstanding, participationStats, percent, topQuestions } from "@/lib/report/aggregate";
import { distribute } from "@/lib/rooms/distribute";
import { toCsv } from "@/lib/report/csv";

describe("이해도 추이", () => {
  it("구간마다 각 수강생의 마지막 상태를 센다 (이전 상태를 이어받음)", () => {
    const b = bucketUnderstanding(
      [
        { participant_id: "a", status: "green", created_at: "2026-10-29T10:00:30Z" },
        { participant_id: "b", status: "red", created_at: "2026-10-29T10:01:00Z" },
        { participant_id: "b", status: "yellow", created_at: "2026-10-29T10:07:00Z" },
        { participant_id: "c", status: "green", created_at: "2026-10-29T10:16:00Z" },
      ],
      5 * 60_000,
    );
    expect(b.map(({ green, yellow, red }) => [green, yellow, red])).toEqual([
      [1, 0, 1], // 10:00
      [1, 1, 0], // 10:05
      [1, 1, 0], // 10:10 (변화 없음, 이어받음)
      [2, 1, 0], // 10:15
    ]);
  });

  it("이벤트가 없으면 빈 배열", () => {
    expect(bucketUnderstanding([])).toEqual([]);
  });
});

describe("참여율", () => {
  it("1회 이상 상호작용한 비율과 1인당 평균", () => {
    const s = participationStats(
      ["a", "b", "c", "d"],
      [
        { participantId: "a", kind: "chat" },
        { participantId: "a", kind: "vote" },
        { participantId: "b", kind: "question" },
        { participantId: null, kind: "chat" }, // 강사
        { participantId: "zzz", kind: "chat" }, // 강퇴/다른 방
      ],
    );
    expect(s.participants).toBe(4);
    expect(s.activeParticipants).toBe(2);
    expect(s.participationRate).toBe(0.5);
    expect(s.avgInteractions).toBe(0.75);
    expect(s.byKind).toEqual({ chat: 1, vote: 1, question: 1 });
  });

  it("참여자가 없어도 0으로 나누지 않는다", () => {
    const s = participationStats([], []);
    expect(s.participationRate).toBe(0);
    expect(s.avgInteractions).toBe(0);
  });

  it("percent", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(1, 0)).toBe(0);
  });
});

describe("공감 TOP 질문", () => {
  it("숨김 제외, 공감 많은 순, 같으면 먼저 올라온 순", () => {
    const top = topQuestions(
      [
        { id: "1", vote_count: 3, created_at: "2026-01-01T00:02:00Z" },
        { id: "2", vote_count: 5, created_at: "2026-01-01T00:03:00Z", hidden: true },
        { id: "3", vote_count: 3, created_at: "2026-01-01T00:01:00Z" },
        { id: "4", vote_count: 1, created_at: "2026-01-01T00:00:00Z" },
      ],
      2,
    );
    expect(top.map((q) => q.id)).toEqual(["3", "1"]);
  });
});

describe("조 랜덤 편성", () => {
  it("인원 차이가 최대 1명이고 모두 한 번씩 배정된다", () => {
    const people = Array.from({ length: 23 }, (_, i) => `p${i}`);
    const groups = distribute(people, 4);
    const sizes = groups.map((g) => g.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(groups.flat().sort()).toEqual([...people].sort());
  });
});

describe("CSV", () => {
  it("BOM, 따옴표·쉼표 이스케이프, 수식 주입 방지", () => {
    const csv = toCsv(["a", "b"], [["안녕, \"반가워\"", "=SUM(A1)"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"안녕, ""반가워"""');
    expect(csv).toContain("'=SUM(A1)");
  });
});
