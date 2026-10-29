import { must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { MESSAGE_SELECT, toChatMessages, type MessageRow } from "@/lib/data/chat";
import { resolveGroupScope } from "@/lib/data/groups";
import { broadcast } from "@/lib/realtime/server";
import { assertRoomPath } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import { chatPostSchema } from "@/lib/validation/comm";

const PAGE = 30;

/** 채팅 목록 (최신 30개씩, before 커서로 이전 메시지) */
export const GET = roomHandler({ allowEnded: true }, async ({ actor, roomId, search }) => {
  const group = resolveGroupScope(actor, search.get("group"));
  const before = search.get("before");
  let q = db().from("messages").select(MESSAGE_SELECT).eq("room_id", roomId).order("created_at", { ascending: false }).limit(PAGE + 1);
  q = group ? q.eq("group_id", group) : q.is("group_id", null);
  if (before) q = q.lt("created_at", before);
  const rows = must(await q) as unknown as MessageRow[];
  const hasMore = rows.length > PAGE;
  const messages = await toChatMessages(rows.slice(0, PAGE).reverse(), actor.kind);
  return { messages, hasMore };
});

export const POST = roomHandler({ body: chatPostSchema }, async ({ actor, roomId, body }) => {
  if (actor.kind === "participant" && actor.room.focus_mode) {
    throw new ApiError(423, "지금은 집중 모드라 채팅이 잠겨 있어요.");
  }
  if (actor.kind === "participant") {
    // 도배 방지: 10초에 8개까지
    const since = new Date(Date.now() - 10_000).toISOString();
    const { count } = await db().from("messages").select("id", { count: "exact", head: true }).eq("participant_id", actor.participant.id).gte("created_at", since);
    if ((count ?? 0) >= 8) throw new ApiError(429, "메시지를 너무 빨리 보내고 있어요. 잠시 후 다시 보내 주세요.");
  }
  const groupId = resolveGroupScope(actor, body.groupId);
  if (body.imagePath) {
    try {
      assertRoomPath(roomId, body.imagePath, "chat");
    } catch {
      throw new ApiError(400, "이미지를 다시 올려 주세요.");
    }
  }
  const row = must(
    await db()
      .from("messages")
      .insert({
        room_id: roomId,
        group_id: groupId,
        participant_id: actor.kind === "participant" ? actor.participant.id : null,
        body: body.body,
        image_path: body.imagePath ?? null,
      })
      .select(MESSAGE_SELECT)
      .single(),
  ) as unknown as MessageRow;
  const [message] = await toChatMessages([row], "participant");
  await broadcast(roomId, "chat.message", { message });
  return { message };
});
