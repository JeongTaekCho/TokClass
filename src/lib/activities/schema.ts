import { z } from "zod";

import type { ActivityConfig, ActivityType } from "@/lib/types";

export const ACTIVITY_TYPES = ["poll", "wordcloud", "quiz", "ranking", "open", "ideas", "task"] as const;

export const ACTIVITY_LABELS: Record<ActivityType, { name: string; emoji: string; description: string }> = {
  poll: { name: "투표", emoji: "📊", description: "객관식 단일/복수 선택" },
  wordcloud: { name: "워드클라우드", emoji: "☁️", description: "짧은 단어를 모아 구름으로" },
  quiz: { name: "퀴즈", emoji: "🧠", description: "정답·제한시간·점수판" },
  ranking: { name: "순위 매기기", emoji: "🏅", description: "항목 순서 정하기" },
  open: { name: "자유 응답", emoji: "✍️", description: "생각을 자유롭게" },
  ideas: { name: "아이디어 보드", emoji: "🗒️", description: "포스트잇 올리고 공감" },
  task: { name: "할 일·타이머", emoji: "⏱️", description: "과제 안내와 완료 체크" },
};

const option = z.string().trim().min(1, "선택지를 입력해 주세요.").max(100, "선택지는 100자까지예요.");
const title = z.string().trim().min(1, "제목(질문)을 입력해 주세요.").max(200, "제목은 200자까지예요.");

export const activityCreateSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("poll"),
    title,
    config: z.object({ options: z.array(option).min(2, "선택지는 2개 이상이에요.").max(10), multiple: z.boolean().default(false), reveal: z.enum(["live", "after"]).default("live") }),
  }),
  z.object({ type: z.literal("wordcloud"), title, config: z.object({ maxWords: z.number().int().min(1).max(3).default(3) }) }),
  z.object({
    type: z.literal("quiz"),
    title,
    config: z
      .object({
        options: z.array(option).min(2, "선택지는 2개 이상이에요.").max(6),
        correct: z.array(z.number().int().min(0)).min(1, "정답을 골라 주세요."),
        timeLimitSec: z.number().int().min(5).max(600).default(30),
        points: z.number().int().min(0).max(1000).default(100),
        leaderboard: z.boolean().default(true),
      })
      .refine((c) => c.correct.every((i) => i < c.options.length), { message: "정답 번호를 확인해 주세요." }),
  }),
  z.object({ type: z.literal("ranking"), title, config: z.object({ items: z.array(option).min(2, "항목은 2개 이상이에요.").max(10) }) }),
  z.object({ type: z.literal("open"), title, config: z.object({}).default({}) }),
  z.object({ type: z.literal("ideas"), title, config: z.object({}).default({}) }),
  z.object({
    type: z.literal("task"),
    title,
    config: z.object({ description: z.string().trim().max(1000).default(""), durationSec: z.number().int().min(0).max(4 * 3600).default(600) }),
  }),
]);
export type ActivityCreate = z.infer<typeof activityCreateSchema>;

export const activityPatchSchema = z.object({ status: z.enum(["draft", "live", "ended"]) });

/** 유형별 응답 검증. 문제가 있으면 한국어 메시지를 던져요. */
export function parseResponse(type: ActivityType, config: ActivityConfig, raw: unknown): Record<string, unknown> {
  const fail = (msg: string): never => {
    throw new z.ZodError([{ code: "custom", message: msg, path: [], input: raw }]);
  };
  const obj = (raw ?? {}) as Record<string, unknown>;
  switch (type) {
    case "poll":
    case "quiz": {
      const n = config.options?.length ?? 0;
      const sel = z.array(z.number().int().min(0).max(n - 1)).min(1, "하나 이상 골라 주세요.").max(n).safeParse(obj.selected);
      if (!sel.success) fail("선택지를 골라 주세요.");
      const selected = [...new Set(sel.data!)].sort((a, b) => a - b);
      if (type === "poll" && !config.multiple && selected.length > 1) fail("하나만 고를 수 있어요.");
      if (type === "quiz" && (config.correct?.length ?? 1) === 1 && selected.length > 1) fail("하나만 고를 수 있어요.");
      return { selected };
    }
    case "wordcloud": {
      const max = config.maxWords ?? 3;
      const words = z.array(z.string().trim().min(1).max(20, "단어는 20자까지예요.")).min(1, "단어를 입력해 주세요.").max(max, `단어는 ${max}개까지예요.`).safeParse(obj.words);
      if (!words.success) fail(words.error!.issues[0]?.message ?? "단어를 확인해 주세요.");
      return { words: words.data!.map((w) => w.replace(/\s+/g, " ")).filter(Boolean) };
    }
    case "ranking": {
      const n = config.items?.length ?? 0;
      const order = z.array(z.number().int().min(0).max(n - 1)).length(n).safeParse(obj.order);
      if (!order.success || new Set(order.data).size !== n) fail("모든 항목의 순서를 정해 주세요.");
      return { order: order.data! };
    }
    case "open": {
      const text = z.string().trim().min(1, "내용을 입력해 주세요.").max(500, "500자까지 쓸 수 있어요.").safeParse(obj.text);
      if (!text.success) fail(text.error!.issues[0]?.message ?? "내용을 확인해 주세요.");
      return { text: text.data! };
    }
    case "task":
      return { done: Boolean(obj.done) };
    case "ideas":
      return {};
  }
}

export const ideaSchema = z.object({
  body: z.string().trim().min(1, "아이디어를 입력해 주세요.").max(200, "200자까지 쓸 수 있어요."),
  color: z.enum(["yellow", "pink", "blue", "green", "purple"]).default("yellow"),
});
