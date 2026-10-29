import { z } from "zod";

import { TAB_KEYS } from "@/lib/rooms/templates";

export const emailSchema = z.string().trim().toLowerCase().email("이메일 형식을 확인해 주세요.");
export const instructorPasswordSchema = z.string().min(8, "비밀번호는 8자 이상이에요.").max(72, "비밀번호가 너무 길어요.");

export const signupSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(30, "이름은 30자 이하로 써 주세요."),
  email: emailSchema,
  password: instructorPasswordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

export const roomCreateSchema = z.object({
  title: z.string().trim().min(1, "수업명을 입력해 주세요.").max(80, "수업명은 80자 이하로 써 주세요."),
  startsAt: z.string().trim().max(40).optional().nullable(),
  capacity: z.coerce.number().int("정원은 숫자로 입력해 주세요.").min(1, "정원은 1명 이상이에요.").max(100, "정원은 최대 100명이에요."),
  template: z.string().trim().min(1).max(60), // lecture | practice | workshop | tpl:{uuid}
});

const tabSchema = z.object({ key: z.enum(TAB_KEYS), enabled: z.boolean() });

export const roomSettingsPatchSchema = z
  .object({
    title: z.string().trim().min(1, "수업명을 입력해 주세요.").max(80).optional(),
    startsAt: z.string().trim().max(40).nullable().optional(),
    capacity: z.coerce.number().int().min(1).max(100, "정원은 최대 100명이에요.").optional(),
    locked: z.boolean().optional(),
    focusMode: z.boolean().optional(),
    tabs: z.array(tabSchema).min(1).max(TAB_KEYS.length).optional(),
    defaultTab: z.enum(TAB_KEYS).optional(),
    qaRevealAuthor: z.boolean().optional(),
    redThreshold: z.coerce.number().int().min(5).max(100).optional(),
    aiDailyLimit: z.coerce.number().int().min(0).max(200).optional(),
    sections: z.array(z.string().trim().min(1).max(30)).max(30).optional(),
    status: z.enum(["active", "ended"]).optional(),
  })
  .strict();

export const templateSaveSchema = z.object({
  name: z.string().trim().min(1, "템플릿 이름을 입력해 주세요.").max(40),
});
