import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { MESSAGE_SELECT, toChatMessages, type MessageRow } from "@/lib/data/chat";
import { resolveGroupScope } from "@/lib/data/groups";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import { hideSchema } from "@/lib/validation/comm";

/** 메시지 1건 (조 채팅 신호·숨김 해제·반응 변경 뒤 다시 받아 올 때). 다른 조 메시지는 볼 수 없어요. */
export const GET = roomHandler({ allowEnded: true }, async ({ actor, roomId, params }) => {
  if (!isUuid(params.messageId)) throw notFound();
  const { data } = await db().from("messages").select(MESSAGE_SELECT).eq("id", params.messageId).eq("room_id", roomId).maybeSingle();
  const row = data as unknown as MessageRow | null;
  if (!row) throw notFound();
  resolveGroupScope(actor, row.group_id);
  const [message] = await toChatMessages([row], actor.kind);
  return { message };
});

/** 부적절한 메시지 숨김/다시 보이기 (강사) */
export const PATCH = roomHandler({ roles: ["instructor"], body: hideSchema, allowEnded: true }, async ({ roomId, params, body }) => {
  if (!isUuid(params.messageId)) throw notFound();
  must(await db().from("messages").update({ hidden: body.hidden }).eq("id", params.messageId).eq("room_id", roomId));
  await broadcast(roomId, "chat.hidden", { id: params.messageId, hidden: body.hidden });
  return { ok: true };
});
