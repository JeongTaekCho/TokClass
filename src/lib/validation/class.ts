import { z } from "zod";

export const questionCreateSchema = z.object({
  body: z.string().trim().min(1, "질문을 입력해 주세요.").max(500, "질문은 500자까지 쓸 수 있어요."),
  anonymous: z.boolean().default(true),
  materialId: z.string().uuid().nullable().optional(),
  page: z.number().int().min(1).max(2000).nullable().optional(),
});

export const questionPatchSchema = z.object({
  answer: z.string().trim().max(1000, "답변은 1000자까지 쓸 수 있어요.").nullable().optional(),
  answered: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

export const understandingSchema = z.object({ status: z.enum(["green", "yellow", "red"]) });

export const helpCreateSchema = z.object({ message: z.string().trim().max(200, "200자까지 쓸 수 있어요.").default("") });
export const helpPatchSchema = z.object({ status: z.enum(["open", "resolved"]) });
