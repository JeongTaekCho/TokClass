import { isUuid, roomHandler } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { loadReactions } from "@/lib/data/chat";
import { resolveGroupScope } from "@/lib/data/groups";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import { messageReactionSchema } from "@/lib/validation/comm";

/** 채팅 메시지 이모지 반응 토글: 이미 누른 이모지면 취소, 아니면 추가 */
export const POST = roomHandler({ body: messageReactionSchema }, async ({ actor, roomId, params, body }) => {
  if (!isUuid(params.messageId)) throw notFound();
  if (actor.kind === "participant" && actor.room.focus_mode) {
    throw new ApiError(423, "지금은 집중 모드라 채팅이 잠겨 있어요.");
  }
  const { data: message } = await db().from("messages").select("id, group_id, hidden").eq("id", params.messageId).eq("room_id", roomId).maybeSingle();
  if (!message || (message.hidden && actor.kind === "participant")) throw notFound();
  resolveGroupScope(actor, message.group_id);

  const participantId = actor.kind === "participant" ? actor.participant.id : null;
  let mine = db().from("message_reactions").select("id").eq("message_id", message.id).eq("emoji", body.emoji);
  mine = participantId ? mine.eq("participant_id", participantId) : mine.is("participant_id", null);
  const { data: existing, error } = await mine.maybeSingle();
  if (error) {
    console.error("[chat] 반응 확인 실패", error.message);
    throw new ApiError(503, "지금은 반응을 남길 수 없어요. 잠시 후 다시 시도해 주세요.");
  }
  if (existing) {
    await db().from("message_reactions").delete().eq("id", existing.id);
  } else {
    // 동시에 두 번 눌려 유일성 제약에 걸리면(23505) 이미 반영된 것이라 무시해요.
    const { error: insertError } = await db().from("message_reactions").insert({ room_id: roomId, message_id: message.id, participant_id: participantId, emoji: body.emoji });
    if (insertError && insertError.code !== "23505") throw new ApiError(503, "지금은 반응을 남길 수 없어요. 잠시 후 다시 시도해 주세요.");
  }

  const reactions = (await loadReactions([message.id])).get(message.id) ?? [];
  await broadcast(roomId, "chat.reactions", { id: message.id, reactions });
  return { reactions };
});
