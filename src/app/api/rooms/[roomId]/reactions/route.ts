import { roomHandler } from "@/lib/api/handler";
import { broadcastMany } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import { reactionSchema } from "@/lib/validation/slides";

/** 이모지 반응: 교안 위에 떠오르고, 페이지가 있으면 페이지 핀으로 저장해요. */
export const POST = roomHandler({ body: reactionSchema }, async ({ actor, roomId, body }) => {
  const materialId = body.materialId ?? null;
  const page = body.page ?? null;
  if (materialId && page) {
    const { data } = await db().from("materials").select("id").eq("id", materialId).eq("room_id", roomId).maybeSingle();
    if (data) {
      await db()
        .from("page_reactions")
        .insert({ room_id: roomId, material_id: materialId, page, participant_id: actor.kind === "participant" ? actor.participant.id : null, emoji: body.emoji });
    }
  }
  await broadcastMany(roomId, [
    { event: "reaction.float", payload: { emoji: body.emoji, materialId, page } },
    ...(materialId ? [{ event: "pins.changed" as const, payload: { materialId } }] : []),
  ]);
  return { ok: true };
});
