import { z } from "zod";

export const REACTION_EMOJIS = ["👍", "👏", "❤️", "😮", "😂", "🤔"] as const;

export const materialCreateSchema = z.object({
  title: z.string().trim().min(1, "교안 이름을 입력해 주세요.").max(100),
  path: z.string().min(1).max(300),
  pageCount: z.number().int().min(1).max(2000),
  sizeBytes: z.number().int().min(0),
});

export const materialPatchSchema = z.object({ title: z.string().trim().min(1).max(100) });

export const slideSchema = z.object({ materialId: z.string().uuid(), page: z.number().int().min(1).max(2000) });

export const reactionSchema = z.object({
  emoji: z.enum(REACTION_EMOJIS),
  materialId: z.string().uuid().nullable().optional(),
  page: z.number().int().min(1).max(2000).nullable().optional(),
});

export const noteSchema = z.object({
  materialId: z.string().uuid(),
  page: z.number().int().min(1).max(2000),
  body: z.string().max(2000, "메모는 2000자까지 쓸 수 있어요."),
});

export const resourceCreateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("link"), title: z.string().trim().min(1, "제목을 입력해 주세요.").max(100), url: z.string().trim().url("링크 주소를 확인해 주세요.").max(1000) }),
  z.object({ kind: z.literal("file"), title: z.string().trim().min(1).max(100), path: z.string().min(1).max(300), sizeBytes: z.number().int().min(0) }),
]);
