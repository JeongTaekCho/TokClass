import { instructorHandler, isUuid, must } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { countOwnerPacks, loadPack, loadPackCards, nextPosition, packFor } from "@/lib/data/lessons";
import { LESSON_LIMITS } from "@/lib/lessons/rules";
import { db } from "@/lib/supabase/admin";

/** 공용(또는 내) 묶음을 내 교안으로 복사해요. 복사본은 원본과 따로 고칠 수 있어요. */
export const POST = instructorHandler({}, async ({ params, access }) => {
  if (!isUuid(params.id)) throw notFound("교안 묶음을 찾을 수 없어요.");
  const row = await packFor(params.id, access, "read");
  if ((await countOwnerPacks(access.user.id)) >= LESSON_LIMITS.ownerPacks) {
    throw new ApiError(400, `내 교안 묶음은 ${LESSON_LIMITS.ownerPacks}개까지 만들 수 있어요.`);
  }
  const d = db();
  const [cards, position] = await Promise.all([loadPackCards(row.id), nextPosition("lesson_packs", "owner_id", access.user.id)]);
  const copy = must(
    await d.from("lesson_packs").insert({ owner_id: access.user.id, title: row.title, intro: row.intro, categories: row.categories ?? [], position }).select("id").single(),
  ) as { id: string };
  if (cards.length) {
    must(
      await d.from("lesson_cards").insert(
        cards.map((c, i) => ({ pack_id: copy.id, kind: c.kind, name: c.name, org: c.org, description: c.description, url: c.url, body: c.body, icon: c.icon, color: c.color, category: c.category, position: i })),
      ),
    );
  }
  return { pack: await loadPack(copy.id) };
});
