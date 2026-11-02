import { instructorHandler, isUuid, must } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { auditPublicPack, loadPack, packFor } from "@/lib/data/lessons";
import { db } from "@/lib/supabase/admin";
import { packPatchSchema } from "@/lib/validation/lessons";

function packId(id: string | undefined) {
  if (!isUuid(id)) throw notFound("교안 묶음을 찾을 수 없어요.");
  return id;
}

/** 묶음 + 카드. 내 묶음, 게시된 공용 묶음(관리자는 게시 전 것도)을 볼 수 있어요. */
export const GET = instructorHandler({}, async ({ params, access }) => {
  const row = await packFor(packId(params.id), access, "read");
  return { pack: await loadPack(row.id) };
});

/** 이름·소개·분류·게시 바꾸기. 게시는 공용 묶음에만 의미가 있어요. 분류를 지우면 그 분류였던 카드는 분류 없음이 돼요. */
export const PATCH = instructorHandler({ body: packPatchSchema }, async ({ params, body, access }) => {
  const row = await packFor(packId(params.id), access, "write");
  const { isPublished, ...rest } = body;
  const update: Record<string, unknown> = { ...rest };
  if (isPublished !== undefined && row.owner_id === null) update.is_published = isPublished;
  const d = db();
  if (Object.keys(update).length) must(await d.from("lesson_packs").update(update).eq("id", row.id));
  if (body.categories) {
    const keep = new Set(body.categories);
    const cards = must(await d.from("lesson_cards").select("id, category").eq("pack_id", row.id).not("category", "is", null)) as { id: string; category: string }[];
    const orphan = cards.filter((c) => !keep.has(c.category)).map((c) => c.id);
    if (orphan.length) must(await d.from("lesson_cards").update({ category: null }).in("id", orphan));
  }
  const label = { ...row, title: body.title ?? row.title };
  if (isPublished !== undefined && isPublished !== row.is_published) await auditPublicPack(access, label, isPublished ? "lesson.publish" : "lesson.unpublish");
  if (Object.keys(rest).length) await auditPublicPack(access, label, "lesson.update", { fields: Object.keys(rest) });
  return { pack: await loadPack(row.id) };
});

export const DELETE = instructorHandler({}, async ({ params, access }) => {
  const row = await packFor(packId(params.id), access, "write");
  must(await db().from("lesson_packs").delete().eq("id", row.id));
  await auditPublicPack(access, row, "lesson.delete");
  return { ok: true };
});
