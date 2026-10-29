import { z } from "zod";

export const STICKERS = ["👍", "❤️", "🔥", "👏", "💡", "🎉"] as const;

export const submissionCreateSchema = z
  .object({
    kind: z.enum(["image", "file", "link", "text"]),
    title: z.string().trim().max(100, "제목은 100자까지예요.").default(""),
    body: z.string().trim().max(3000, "내용은 3000자까지예요.").default(""),
    url: z.string().trim().max(1000).optional().nullable(),
    path: z.string().max(300).optional().nullable(),
    fileName: z.string().max(200).optional().nullable(),
    mime: z.string().max(120).optional().nullable(),
    size: z.number().int().min(0).optional(),
    section: z.string().trim().max(30).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if ((v.kind === "image" || v.kind === "file") && !v.path) ctx.addIssue({ code: "custom", message: "파일을 올려 주세요." });
    if (v.kind === "link") {
      if (!v.url || !/^https?:\/\/\S+$/i.test(v.url)) ctx.addIssue({ code: "custom", message: "링크 주소(http/https)를 확인해 주세요." });
    }
    if (v.kind === "text" && !v.body) ctx.addIssue({ code: "custom", message: "내용을 입력해 주세요." });
  });

export const submissionPatchSchema = z.object({
  isBest: z.boolean().optional(),
  hidden: z.boolean().optional(),
  section: z.string().trim().max(30).nullable().optional(),
});

export const commentSchema = z.object({ body: z.string().trim().min(1, "댓글을 입력해 주세요.").max(500, "댓글은 500자까지예요.") });
export const stickerSchema = z.object({ sticker: z.enum(STICKERS) });
