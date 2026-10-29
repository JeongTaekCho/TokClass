import { z } from "zod";

export const chatPostSchema = z
  .object({
    body: z.string().trim().max(2000, "메시지는 2000자까지 쓸 수 있어요.").default(""),
    imagePath: z.string().max(300).nullable().optional(),
    groupId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.body.length > 0 || v.imagePath, { message: "메시지를 입력해 주세요." });

export const hideSchema = z.object({ hidden: z.boolean() });

export const announcementSchema = z.object({
  body: z.string().trim().min(1, "공지 내용을 입력해 주세요.").max(500, "공지는 500자까지 쓸 수 있어요."),
});

export const dmPostSchema = z.object({
  participantId: z.string().uuid().optional(),
  body: z.string().trim().min(1, "메시지를 입력해 주세요.").max(1000, "메시지는 1000자까지 쓸 수 있어요."),
});
