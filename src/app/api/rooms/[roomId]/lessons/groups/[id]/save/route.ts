import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { CARD_COLS, countOwnerPacks, loadRoomGroup, nextPosition, type CardRow } from "@/lib/data/lessons";
import { LESSON_LIMITS } from "@/lib/lessons/rules";
import { db } from "@/lib/supabase/admin";

/** 방 교안 묶음을 내 라이브러리 묶음으로 저장(복사). 숨김 여부는 방 안에서만 쓰는 값이라 옮기지 않아요. */
export const POST = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ actor, roomId, params }) => {
  if (!isUuid(params.id) || actor.kind !== "instructor") throw notFound();
  const group = await loadRoomGroup(roomId, params.id);
  if ((await countOwnerPacks(actor.userId)) >= LESSON_LIMITS.ownerPacks) {
    throw new ApiError(400, `내 교안 묶음은 ${LESSON_LIMITS.ownerPacks}개까지 만들 수 있어요.`);
  }
  const d = db();
  const cards = must(await d.from("room_lesson_cards").select(CARD_COLS).eq("group_id", group.id).order("position").order("created_at")) as CardRow[];
  const position = await nextPosition("lesson_packs", "owner_id", actor.userId);
  const pack = must(
    await d.from("lesson_packs").insert({ owner_id: actor.userId, title: group.title, intro: group.intro, categories: group.categories, position }).select("id, title").single(),
  ) as { id: string; title: string };
  if (cards.length) {
    must(
      await d.from("lesson_cards").insert(
        cards.map((c, i) => ({ pack_id: pack.id, kind: c.kind, name: c.name, org: c.org, description: c.description, url: c.url, body: c.body, icon: c.icon, color: c.color, category: c.category, position: i })),
      ),
    );
  }
  return { pack, cardCount: cards.length };
});
