import { instructorHandler, must } from "@/lib/api/handler";
import { ApiError, forbidden } from "@/lib/api/errors";
import { auditPublicPack, countOwnerPacks, listPacks, loadPack, nextPosition } from "@/lib/data/lessons";
import { LESSON_LIMITS } from "@/lib/lessons/rules";
import { db } from "@/lib/supabase/admin";
import { packCreateSchema } from "@/lib/validation/lessons";

/** 묶음 목록 + 카드 수. scope=public|mine. 관리자는 all=1로 게시 전 공용 묶음까지 봐요. */
export const GET = instructorHandler({}, async ({ req, access }) => {
  const sp = req.nextUrl.searchParams;
  const scope = sp.get("scope") === "public" ? "public" : "mine";
  const all = scope === "public" && sp.get("all") === "1";
  if (all && !access.profile.isAdmin) throw forbidden("관리자만 볼 수 있어요.");
  return { packs: await listPacks(scope, access.user.id, all) };
});

/** 묶음 만들기. scope=public(공용)은 관리자만 만들 수 있고, 게시 전 상태로 만들어져요. */
export const POST = instructorHandler({ body: packCreateSchema }, async ({ body, access }) => {
  const isPublic = body.scope === "public";
  if (isPublic && !access.profile.isAdmin) throw forbidden("공용 교안은 관리자만 만들 수 있어요.");
  const ownerId = isPublic ? null : access.user.id;
  if ((await countOwnerPacks(ownerId)) >= LESSON_LIMITS.ownerPacks) {
    throw new ApiError(400, `교안 묶음은 ${LESSON_LIMITS.ownerPacks}개까지 만들 수 있어요.`);
  }
  const position = await nextPosition("lesson_packs", "owner_id", ownerId);
  const row = must(
    await db().from("lesson_packs").insert({ owner_id: ownerId, title: body.title, intro: body.intro, categories: body.categories, position }).select("id, owner_id, title").single(),
  ) as { id: string; owner_id: string | null; title: string };
  await auditPublicPack(access, row, "lesson.create");
  return { pack: await loadPack(row.id) };
});
