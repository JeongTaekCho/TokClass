import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import { hideSchema } from "@/lib/validation/comm";

/** 부적절한 메시지 숨김/다시 보이기 (강사) */
export const PATCH = roomHandler({ roles: ["instructor"], body: hideSchema, allowEnded: true }, async ({ roomId, params, body }) => {
  if (!isUuid(params.messageId)) throw notFound();
  must(await db().from("messages").update({ hidden: body.hidden }).eq("id", params.messageId).eq("room_id", roomId));
  await broadcast(roomId, "chat.hidden", { id: params.messageId, hidden: body.hidden });
  return { ok: true };
});
