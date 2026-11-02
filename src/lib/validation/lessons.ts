import { z } from "zod";

import { graphemeLength, isHttpUrl, LESSON_COLORS, LESSON_KINDS, LESSON_LIMITS } from "@/lib/lessons/rules";

/*
 * 교안 입력 검증 (화면·서버 공용)
 * - 문자열은 앞뒤 공백을 정리해요.
 * - 분류(category)가 그룹 분류에 있는지는 그룹을 알아야 해서 서버에서 categoryAllowed로 따로 확인해요.
 */

const uuid = z.string().uuid();
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullish()
    .transform((v) => v || null);

const fields = {
  name: z.string().trim().min(1, "카드 이름을 입력해 주세요.").max(80, "카드 이름은 80자까지 쓸 수 있어요."),
  org: optionalText(40, "회사·기관 이름은 40자까지 쓸 수 있어요."),
  description: z.string().trim().max(200, "설명은 200자까지 쓸 수 있어요.").nullish().transform((v) => v ?? ""),
  icon: z
    .string()
    .trim()
    .max(16, "아이콘은 1~4글자로 써 주세요.")
    .refine((v) => {
      const n = graphemeLength(v);
      return n >= 1 && n <= 4;
    }, "아이콘은 1~4글자로 써 주세요."),
  color: z.enum(LESSON_COLORS, { message: "색을 골라 주세요." }),
  category: optionalText(30, "분류 이름은 30자까지 쓸 수 있어요."),
  url: z
    .string()
    .trim()
    .min(1, "링크 주소를 입력해 주세요.")
    .max(2000, "링크 주소는 2,000자까지 넣을 수 있어요.")
    .refine(isHttpUrl, "http:// 또는 https:// 로 시작하는 주소만 넣을 수 있어요."),
  body: z.string().trim().min(1, "복사할 내용을 입력해 주세요.").max(20000, "복사할 내용은 20,000자까지 쓸 수 있어요."),
};

const linkCardSchema = z.object({
  kind: z.literal("link"),
  name: fields.name,
  org: fields.org,
  description: fields.description,
  icon: fields.icon,
  color: fields.color,
  category: fields.category,
  url: fields.url,
});

const copyCardSchema = z.object({
  kind: z.literal("copy"),
  name: fields.name,
  org: fields.org,
  description: fields.description,
  icon: fields.icon,
  color: fields.color,
  category: fields.category,
  body: fields.body,
});

/** 카드 하나 (라이브러리·방 공용). link는 url, copy는 body가 꼭 있어야 해요. */
export const lessonCardSchema = z.discriminatedUnion("kind", [linkCardSchema, copyCardSchema], { message: "카드 종류를 골라 주세요." });
export type LessonCardInput = z.infer<typeof lessonCardSchema>;

/** 카드 고치기: 바뀌는 칸만 받아요. 서버가 지금 값과 합친 뒤 lessonCardSchema로 다시 확인해요. */
export const lessonCardPatchSchema = z.object({
  kind: z.enum(LESSON_KINDS).optional(),
  name: z.string().optional(),
  org: z.string().nullish(),
  description: z.string().nullish(),
  icon: z.string().optional(),
  color: z.string().optional(),
  category: z.string().nullish(),
  url: z.string().nullish(),
  body: z.string().nullish(),
});

export const roomCardCreateSchema = z.object({ groupId: uuid }).and(lessonCardSchema);
export const roomCardPatchSchema = lessonCardPatchSchema.extend({ hidden: z.boolean().optional(), groupId: uuid.optional() });

const categoriesField = z
  .array(z.string().trim().min(1, "분류 이름을 입력해 주세요.").max(30, "분류 이름은 30자까지 쓸 수 있어요."))
  .max(LESSON_LIMITS.categories, `분류는 ${LESSON_LIMITS.categories}개까지 만들 수 있어요.`)
  .transform((list) => [...new Set(list)]);

const groupFields = {
  title: z.string().trim().min(1, "묶음 이름을 입력해 주세요.").max(60, "묶음 이름은 60자까지 쓸 수 있어요."),
  intro: z.string().trim().max(300, "소개 문구는 300자까지 쓸 수 있어요.").nullish().transform((v) => v ?? ""),
  categories: categoriesField,
};

/** 방 그룹·라이브러리 묶음 만들기 */
export const lessonGroupCreateSchema = z.object({
  title: groupFields.title,
  intro: groupFields.intro,
  categories: categoriesField.optional().default([]),
});

export const roomGroupPatchSchema = z.object({
  title: groupFields.title.optional(),
  intro: groupFields.intro.optional(),
  categories: categoriesField.optional(),
  hidden: z.boolean().optional(),
});

export const packScopeSchema = z.enum(["mine", "public"]);
export const packCreateSchema = lessonGroupCreateSchema.extend({ scope: packScopeSchema.optional().default("mine") });
export const packPatchSchema = z.object({
  title: groupFields.title.optional(),
  intro: groupFields.intro.optional(),
  categories: categoriesField.optional(),
  isPublished: z.boolean().optional(),
});

/** 방 교안 순서 한 번에 저장: 그룹 순서 + 그룹마다 카드 순서 */
export const roomReorderSchema = z.object({
  groups: z
    .array(z.object({ id: uuid, cardIds: z.array(uuid).max(LESSON_LIMITS.packCards) }))
    .max(LESSON_LIMITS.roomGroups),
});

export const packCardsReorderSchema = z.object({ cardIds: z.array(uuid).max(LESSON_LIMITS.packCards) });
export const packsReorderSchema = z.object({ scope: packScopeSchema, ids: z.array(uuid).max(500) });

/** 라이브러리에서 방으로 가져오기. cardIds가 없으면 묶음 전체를 새 그룹으로 넣어요. */
export const roomImportSchema = z.object({
  packId: uuid,
  cardIds: z.array(uuid).min(1, "가져올 카드를 골라 주세요.").max(LESSON_LIMITS.packCards).optional(),
  targetGroupId: uuid.optional(),
});

/** 카드 분류가 그룹 분류 중 하나인지 (없으면 통과) */
export function categoryAllowed(category: string | null | undefined, categories: string[]) {
  return !category || categories.includes(category);
}

/** 관리자 JSON 가져오기: `{ packs: [{ title, intro, categories, cards: [...] }] }` */
export const adminImportSchema = z.object({
  packs: z
    .array(
      lessonGroupCreateSchema
        .extend({
          cards: z.array(lessonCardSchema).max(LESSON_LIMITS.packCards, `한 묶음에는 카드를 ${LESSON_LIMITS.packCards}장까지 넣을 수 있어요.`).default([]),
        })
        .superRefine((pack, ctx) => {
          pack.cards.forEach((c, i) => {
            if (!categoryAllowed(c.category, pack.categories)) {
              ctx.addIssue({ code: "custom", path: ["cards", i, "category"], message: `분류 '${c.category}'가 묶음 분류에 없어요.` });
            }
          });
        }),
    )
    .min(1, "가져올 묶음이 없어요.")
    .max(LESSON_LIMITS.ownerPacks, `한 번에 ${LESSON_LIMITS.ownerPacks}개 묶음까지 가져올 수 있어요.`),
});
export type AdminImportInput = z.infer<typeof adminImportSchema>;

/** 가져오기 오류를 "2번째 묶음 · 3번째 카드: …"처럼 위치와 함께 알려 줘요. */
export function describeImportIssue(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "파일 내용을 확인해 주세요.";
  const [, packIdx, part, cardIdx] = issue.path;
  const where: string[] = [];
  if (typeof packIdx === "number") where.push(`${packIdx + 1}번째 묶음`);
  if (part === "cards" && typeof cardIdx === "number") where.push(`${cardIdx + 1}번째 카드`);
  return where.length ? `${where.join(" · ")}: ${issue.message}` : issue.message;
}
