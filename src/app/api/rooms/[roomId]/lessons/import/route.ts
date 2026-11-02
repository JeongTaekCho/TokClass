import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { ApiError, forbidden, notFound } from "@/lib/api/errors";
import { countRoomLessons, loadPackCards, loadPackRow, loadRoomGroup, nextPosition, roomLessonsChanged } from "@/lib/data/lessons";
import { mergeCategories, planRoomImport } from "@/lib/lessons/rules";
import { db } from "@/lib/supabase/admin";
import { roomImportSchema } from "@/lib/validation/lessons";

/**
 * 라이브러리에서 방으로 가져오기 (강사). 카드를 복사해서 넣으니 라이브러리를 고쳐도 방은 그대로예요.
 * - cardIds가 없으면 묶음 전체를 새 그룹으로
 * - 있으면 고른 카드만 targetGroupId(없으면 새 그룹)에
 * 게시된 공용 묶음이나 내 묶음만 가져올 수 있어요.
 */
export const POST = roomHandler({ roles: ["instructor"], body: roomImportSchema, allowEnded: true }, async ({ actor, roomId, body }) => {
  if (actor.kind !== "instructor") throw forbidden();
  const pack = await loadPackRow(body.packId);
  if (!pack) throw notFound("교안 묶음을 찾을 수 없어요.");
  if (!(pack.owner_id === actor.userId || (pack.owner_id === null && pack.is_published))) throw forbidden("이 교안 묶음은 가져올 수 없어요.");

  let cards = await loadPackCards(pack.id);
  if (body.cardIds) {
    const want = new Set(body.cardIds);
    cards = cards.filter((c) => want.has(c.id));
    if (cards.length !== want.size) throw new ApiError(400, "고른 카드 중 묶음에 없는 카드가 있어요. 새로고침해 주세요.");
  }
  const target = body.cardIds && body.targetGroupId && isUuid(body.targetGroupId) ? await loadRoomGroup(roomId, body.targetGroupId) : null;

  const counts = await countRoomLessons(roomId);
  let targetCards = 0;
  if (target) {
    const { count } = await db().from("room_lesson_cards").select("id", { count: "exact", head: true }).eq("group_id", target.id);
    targetCards = count ?? 0;
  }
  const plan = planRoomImport({ roomGroups: counts.groups, roomCards: counts.cards, adding: cards.length, newGroup: !target, targetCards });
  if (!plan.ok) throw new ApiError(400, plan.error);

  const d = db();
  let groupId: string;
  let categoryOf = (c: string | null) => c;
  if (target) {
    groupId = target.id;
    const merged = mergeCategories(target.categories ?? [], cards.map((c) => c.category));
    if (merged.categories.length !== (target.categories ?? []).length) must(await d.from("room_lesson_groups").update({ categories: merged.categories }).eq("id", target.id));
    categoryOf = merged.cardCategory;
  } else {
    const position = await nextPosition("room_lesson_groups", "room_id", roomId);
    const created = must(
      await d
        .from("room_lesson_groups")
        .insert({ room_id: roomId, source_pack_id: pack.id, title: pack.title, intro: pack.intro, categories: pack.categories ?? [], position })
        .select("id")
        .single(),
    ) as { id: string };
    groupId = created.id;
  }
  const start = target ? await nextPosition("room_lesson_cards", "group_id", groupId) : 0;
  must(
    await d.from("room_lesson_cards").insert(
      cards.map((c, i) => ({
        room_id: roomId,
        group_id: groupId,
        kind: c.kind,
        name: c.name,
        org: c.org,
        description: c.description,
        url: c.url,
        body: c.body,
        icon: c.icon,
        color: c.color,
        category: categoryOf(c.category),
        position: start + i,
      })),
    ),
  );
  return { ...(await roomLessonsChanged(roomId)), imported: cards.length, groupId };
});
