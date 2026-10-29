import { z } from "zod";

export const joinCodeSchema = z.string().regex(/^\d{6}$/, "참여코드는 숫자 6자리예요.");

export const nicknameSchema = z
  .string()
  .trim()
  .min(2, "닉네임은 2자 이상이에요.")
  .max(12, "닉네임은 12자 이하예요.")
  .regex(/^[^\s<>"'`]+(?: [^\s<>"'`]+)*$/, "닉네임에 쓸 수 없는 문자가 있어요.");

export const joinNewSchema = z.object({
  code: joinCodeSchema,
  nickname: nicknameSchema,
  remember: z.boolean().default(true),
});

export const joinPasswordSchema = z.object({
  code: joinCodeSchema,
  password: z.string().trim().min(1, "비밀번호를 입력해 주세요.").max(20),
  remember: z.boolean().default(true),
  confirm: z.boolean().default(false), // false면 닉네임 확인만, true면 실제 입장
});
