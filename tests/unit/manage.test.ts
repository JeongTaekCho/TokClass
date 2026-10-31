import { describe, expect, it } from "vitest";

import { ilikeAny, searchTerm } from "@/lib/admin/search";
import { startOfTodayKst } from "@/lib/format";
import { filterParticipants, participantState, sortParticipants } from "@/lib/manage/filter";

const people = [
  { id: "a", roomId: "r1", nickname: "민지", kicked: false },
  { id: "b", roomId: "r1", nickname: "하나", kicked: true },
  { id: "c", roomId: "r2", nickname: "Minsu", kicked: false },
  { id: "d", roomId: "r2", nickname: "가람", kicked: false },
];
const online = new Set(["c", "b"]);

describe("수강생 관리 필터", () => {
  it("강퇴가 접속 여부보다 우선한다", () => {
    expect(participantState(people[1]!, online)).toBe("kicked");
    expect(participantState(people[2]!, online)).toBe("online");
    expect(participantState(people[0]!, online)).toBe("offline");
  });

  it("방·닉네임(대소문자 무시)·상태로 거른다", () => {
    const f = (o: Partial<Parameters<typeof filterParticipants>[1]>) =>
      filterParticipants(people, { roomId: null, query: "", state: "all", online, ...o }).map((p) => p.id);
    expect(f({})).toEqual(["a", "b", "c", "d"]);
    expect(f({ roomId: "r2" })).toEqual(["c", "d"]);
    expect(f({ query: " minsu " })).toEqual(["c"]);
    expect(f({ state: "online" })).toEqual(["c"]);
    expect(f({ state: "offline" })).toEqual(["a", "d"]);
    expect(f({ state: "kicked" })).toEqual(["b"]);
    expect(f({ roomId: "r1", state: "online" })).toEqual([]);
  });

  it("접속 중 → 오프라인 → 강퇴됨 순, 같은 상태는 닉네임 순", () => {
    expect(sortParticipants(people, online).map((p) => p.id)).toEqual(["c", "d", "a", "b"]);
  });
});

describe("관리자 검색어", () => {
  it("PostgREST 필터 구문을 깨는 문자를 지운다", () => {
    expect(searchTerm("kim,email.eq.x")).toBe("kim email.eq.x");
    expect(searchTerm("a(b)c")).toBe("a b c");
    expect(searchTerm('he said "hi"\\')).toBe("he said hi");
    expect(searchTerm("100%_*")).toBe("100");
  });

  it("비거나 문자열이 아니면 null, 길이는 제한한다", () => {
    expect(searchTerm("   ")).toBeNull();
    expect(searchTerm(undefined)).toBeNull();
    expect(searchTerm(["a"])).toBeNull();
    expect(searchTerm("x".repeat(80))).toHaveLength(50);
  });

  it("여러 컬럼 ilike or 필터", () => {
    expect(ilikeAny(["name", "email"], "kim")).toBe("name.ilike.*kim*,email.ilike.*kim*");
  });
});

describe("한국 시간 오늘 0시", () => {
  it("UTC 15시 이후는 한국 기준 다음 날", () => {
    expect(startOfTodayKst(new Date("2026-10-31T14:59:59Z"))).toBe("2026-10-30T15:00:00.000Z");
    expect(startOfTodayKst(new Date("2026-10-31T15:00:00Z"))).toBe("2026-10-31T15:00:00.000Z");
    expect(startOfTodayKst(new Date("2026-10-31T03:00:00Z"))).toBe("2026-10-30T15:00:00.000Z");
  });
});
