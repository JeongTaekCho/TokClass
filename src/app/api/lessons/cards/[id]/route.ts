import { instructorHandler, isUuid, must } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { auditPublicPack, CARD_COLS, cardInputOf, cardRow, loadPack, packFor, type CardRow } from "@/lib/data/lessons";
import { db } from "@/lib/supabase/admin";
import type { InstructorAccess } from "@/lib/supabase/server";
import { categoryAllowed, lessonCardPatchSchema, lessonCardSchema } from "@/lib/validation/lessons";

async function loadCard(id: string | undefined, access: InstructorAccess) {
  if (!isUuid(id)) throw notFound("교안 카드를 찾을 수 없어요.");
  const card = must(await db().from("lesson_cards").select(`${CARD_COLS}, pack_id`).eq("id", id).maybeSingle()) as CardRow | null;
  if (!card) throw notFound("교안 카드를 찾을 수 없어요.");
  const pack = await packFor(card.pack_id!, access, "write");
  return { card, pack };
}

/** 라이브러리 카드 고치기. 지금 값과 합친 뒤 다시 검증해요. */
export const PATCH = instructorHandler({ body: lessonCardPatchSchema }, async ({ params, body, access }) => {
  const { card, pack } = await loadCard(params.id, access);
  const merged = lessonCardSchema.parse({ ...cardInputOf(card), ...Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) });
  if (!categoryAllowed(merged.category, pack.categories ?? [])) throw new ApiError(400, "묶음에 있는 분류만 고를 수 있어요.");
  must(await db().from("lesson_cards").update(cardRow(merged)).eq("id", card.id));
  await auditPublicPack(access, pack, "lesson.card_update", { cardId: card.id, name: merged.name });
  return { pack: await loadPack(pack.id) };
});

export const DELETE = instructorHandler({}, async ({ params, access }) => {
  const { card, pack } = await loadCard(params.id, access);
  must(await db().from("lesson_cards").delete().eq("id", card.id));
  await auditPublicPack(access, pack, "lesson.card_delete", { cardId: card.id, name: card.name });
  return { pack: await loadPack(pack.id) };
});
