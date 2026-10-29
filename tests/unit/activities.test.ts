import { describe, expect, it } from "vitest";

import { computeResults, normalizeWord, resultsVisible, sanitizeActivity, scoreQuiz, type ResponseInput } from "@/lib/activities/results";
import { activityCreateSchema, parseResponse } from "@/lib/activities/schema";
import { mergeClusters, looksLikeQuestion, toPromptInput } from "@/lib/ai/cluster";

const r = (id: string, data: Record<string, unknown>, score = 0): ResponseInput => ({ id, participantId: id, nickname: `닉${id}`, data, score, createdAt: `2026-01-01T00:00:0${id}Z` });

describe("투표·퀴즈 집계", () => {
  it("선택지별 표 수", () => {
    const res = computeResults("poll", { options: ["A", "B", "C"] }, [r("1", { selected: [0] }), r("2", { selected: [0, 2] }), r("3", { selected: [9] })], { viewer: { kind: "instructor" } });
    expect(res).toMatchObject({ type: "poll", total: 3, counts: [2, 0, 1] });
  });

  it("퀴즈는 정답과 점수판을 함께 준다", () => {
    const res = computeResults("quiz", { options: ["A", "B"], correct: [1], leaderboard: true }, [r("1", { selected: [1] })], { viewer: { kind: "public" }, leaderboard: [{ nickname: "닉1", score: 90 }] });
    expect(res).toMatchObject({ correct: [1], leaderboard: [{ nickname: "닉1", score: 90 }] });
  });

  it("퀴즈 점수: 정답+빠를수록 높고, 오답·시간 초과는 0점", () => {
    const cfg = { correct: [1], timeLimitSec: 20, points: 100 };
    expect(scoreQuiz(cfg, [1], 0)).toBe(100);
    expect(scoreQuiz(cfg, [1], 10_000)).toBe(75);
    expect(scoreQuiz(cfg, [1], 20_000)).toBe(50);
    expect(scoreQuiz(cfg, [0], 1_000)).toBe(0);
    expect(scoreQuiz(cfg, [1], 30_000)).toBe(0);
  });
});

describe("결과 공개 시점과 정답 숨김", () => {
  it("종료 후 공개 투표는 진행 중엔 수강생에게 안 보인다", () => {
    expect(resultsVisible({ type: "poll", status: "live", config: { reveal: "after" } }, "participant")).toBe(false);
    expect(resultsVisible({ type: "poll", status: "ended", config: { reveal: "after" } }, "participant")).toBe(true);
    expect(resultsVisible({ type: "poll", status: "live", config: { reveal: "after" } }, "instructor")).toBe(true);
    expect(resultsVisible({ type: "quiz", status: "live", config: {} }, "participant")).toBe(false);
  });

  it("진행 중 퀴즈의 정답은 수강생에게 보내지 않는다", () => {
    const live = sanitizeActivity({ type: "quiz", status: "live", config: { options: ["A"], correct: [0] } }, "participant");
    expect(live.config.correct).toBeUndefined();
    const ended = sanitizeActivity({ type: "quiz", status: "ended", config: { options: ["A"], correct: [0] } }, "participant");
    expect(ended.config.correct).toEqual([0]);
  });
});

describe("워드클라우드·순위·할 일·자유 응답", () => {
  it("워드클라우드는 대소문자·공백을 합친다", () => {
    expect(normalizeWord("  Chat  GPT ")).toBe("chat gpt");
    const res = computeResults("wordcloud", {}, [r("1", { words: ["AI", "자동화"] }), r("2", { words: ["ai"] })], { viewer: { kind: "public" } });
    expect(res).toMatchObject({ words: [{ count: 2 }, { text: "자동화", count: 1 }] });
  });

  it("순위는 평균 순위가 낮은 순", () => {
    const res = computeResults("ranking", { items: ["가", "나", "다"] }, [r("1", { order: [2, 0, 1] }), r("2", { order: [2, 1, 0] })], { viewer: { kind: "public" } });
    expect(res.type === "ranking" && res.items.map((i) => i.label)).toEqual(["다", "가", "나"]);
  });

  it("할 일 완료율", () => {
    const res = computeResults("task", {}, [r("1", { done: true }), r("2", { done: false })], { viewer: { kind: "public" }, participantCount: 4 });
    expect(res).toEqual({ type: "task", total: 2, done: 1, participants: 4 });
  });

  it("자유 응답은 강사에게만 이름을 보여준다", () => {
    const pub = computeResults("open", {}, [r("1", { text: "좋아요" })], { viewer: { kind: "public" } });
    const inst = computeResults("open", {}, [r("1", { text: "좋아요" })], { viewer: { kind: "instructor" } });
    expect(pub.type === "open" && pub.answers[0]!.nickname).toBeNull();
    expect(inst.type === "open" && inst.answers[0]!.nickname).toBe("닉1");
  });
});

describe("응답·활동 검증", () => {
  it("단일 선택 투표에 두 개를 고르면 거부", () => {
    expect(() => parseResponse("poll", { options: ["A", "B"], multiple: false }, { selected: [0, 1] })).toThrow();
    expect(parseResponse("poll", { options: ["A", "B"], multiple: true }, { selected: [1, 0, 1] })).toEqual({ selected: [0, 1] });
  });

  it("순위는 모든 항목을 한 번씩", () => {
    expect(() => parseResponse("ranking", { items: ["a", "b"] }, { order: [0, 0] })).toThrow();
    expect(parseResponse("ranking", { items: ["a", "b"] }, { order: [1, 0] })).toEqual({ order: [1, 0] });
  });

  it("퀴즈 정답 번호가 선택지를 벗어나면 거부", () => {
    expect(activityCreateSchema.safeParse({ type: "quiz", title: "Q", config: { options: ["a", "b"], correct: [3] } }).success).toBe(false);
    expect(activityCreateSchema.safeParse({ type: "quiz", title: "Q", config: { options: ["a", "b"], correct: [1] } }).success).toBe(true);
  });
});

describe("AI 질문 묶기 후처리", () => {
  it("채팅에서 질문만 고른다", () => {
    expect(looksLikeQuestion("이거 어떻게 하나요?")).toBe(true);
    expect(looksLikeQuestion("API 키는 어디서 받는지 궁금해요")).toBe(true);
    expect(looksLikeQuestion("안녕하세요")).toBe(false);
  });

  it("모델 결과를 원래 질문과 합치고 빠진 질문은 기타로", () => {
    const { inputs, byId } = toPromptInput([
      { id: "a", text: "프롬프트 길이?", source: "qa", votes: 3 },
      { id: "b", text: "긴 프롬프트가 좋나요?", source: "chat", votes: 0 },
      { id: "c", text: "보안은?", source: "qa", votes: 1 },
    ]);
    expect(inputs.map((i) => i.id)).toEqual(["q1", "q2", "q3"]);
    const merged = mergeClusters({ clusters: [{ title: "프롬프트", representative: "프롬프트는 길수록 좋나요?", questionIds: ["q1", "q2", "q1", "zz"] }] }, byId);
    expect(merged[0]).toMatchObject({ title: "프롬프트", count: 2, votes: 3 });
    expect(merged[1]).toMatchObject({ title: "기타", count: 1 });
  });
});
