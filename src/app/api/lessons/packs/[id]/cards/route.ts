import { instructorHandler, isUuid, must } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { auditPublicPack, cardRow, countPackCards, loadPack, nextPosition, packFor } from "@/lib/data/lessons";
import { LESSON_LIMITS } from "@/lib/lessons/rules";
import { db } from "@/lib/supabase/admin";
import { categoryAllowed, lessonCardSchema } from "@/lib/validation/lessons";

/** 라이브러리 묶음에 카드 만들기 */
export const POST = instructorHandler({ body: lessonCardSchema }, async ({ params, body, access }) => {
  if (!isUuid(params.id)) throw notFound("교안 묶음을 찾을 수 없어요.");
  const row = await packFor(params.id, access, "write");
  if (!categoryAllowed(body.category, row.categories ?? [])) throw new ApiError(400, "묶음에 있는 분류만 고를 수 있어요.");
  if ((await countPackCards(row.id)) >= LESSON_LIMITS.packCards) throw new ApiError(400, `한 묶음에는 카드를 ${LESSON_LIMITS.packCards}장까지 넣을 수 있어요.`);
  const position = await nextPosition("lesson_cards", "pack_id", row.id);
  must(await db().from("lesson_cards").insert({ pack_id: row.id, ...cardRow(body), position }));
  await auditPublicPack(access, row, "lesson.card_create", { name: body.name });
  return { pack: await loadPack(row.id) };
});
