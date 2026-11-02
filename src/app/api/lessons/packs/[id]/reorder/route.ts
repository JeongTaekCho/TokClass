import { instructorHandler, isUuid, must } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { auditPublicPack, loadPack, packFor } from "@/lib/data/lessons";
import { diffOrder } from "@/lib/lessons/rules";
import { db } from "@/lib/supabase/admin";
import { packCardsReorderSchema } from "@/lib/validation/lessons";

/** 묶음 안 카드 순서 저장. 바뀐 행만 고쳐요. */
export const POST = instructorHandler({ body: packCardsReorderSchema }, async ({ params, body, access }) => {
  if (!isUuid(params.id)) throw notFound("교안 묶음을 찾을 수 없어요.");
  const row = await packFor(params.id, access, "write");
  const d = db();
  const cards = must(await d.from("lesson_cards").select("id, position").eq("pack_id", row.id)) as { id: string; position: number }[];
  const now = new Map(cards.map((c) => [c.id, { parent: row.id, position: c.position }]));
  if (new Set(body.cardIds).size !== body.cardIds.length || body.cardIds.some((id) => !now.has(id))) throw new ApiError(400, "없는 카드가 있어요. 새로고침해 주세요.");
  const changes = diffOrder([{ parent: row.id, ids: body.cardIds }], now);
  await Promise.all(changes.map((c) => d.from("lesson_cards").update({ position: c.position }).eq("id", c.id).then(must)));
  if (changes.length) await auditPublicPack(access, row, "lesson.reorder", { cards: changes.length });
  return { pack: await loadPack(row.id) };
});
