import { randomBytes } from "node:crypto";

import { must, roomHandler } from "@/lib/api/handler";
import { db } from "@/lib/supabase/admin";

/** 읽기 전용 링크 발급(재발급) */
export const POST = roomHandler({ roles: ["instructor"] }, async ({ roomId }) => {
  const token = randomBytes(18).toString("base64url");
  must(await db().from("rooms").update({ readonly_token: token }).eq("id", roomId));
  return { token };
});

/** 읽기 전용 링크 끄기 */
export const DELETE = roomHandler({ roles: ["instructor"] }, async ({ roomId }) => {
  must(await db().from("rooms").update({ readonly_token: null }).eq("id", roomId));
  return { token: null };
});
