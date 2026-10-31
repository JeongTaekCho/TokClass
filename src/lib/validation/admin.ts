import { z } from "zod";

import { STATUS_ACTIONS } from "@/lib/admin/rules";

const reason = z.string().trim().max(500, "사유는 500자 이하로 써 주세요.").optional().nullable();

export const instructorActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(STATUS_ACTIONS), reason }),
  z.object({ action: z.literal("grant_admin") }),
  z.object({ action: z.literal("revoke_admin") }),
]);

export const adminRoomActionSchema = z.object({ action: z.literal("end") });

export const adminRoomDeleteSchema = z.object({ confirmTitle: z.string().max(200) });
