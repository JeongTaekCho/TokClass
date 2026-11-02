import { ZodError } from "zod";

import { adminHandler, must } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { writeAudit } from "@/lib/admin/server";
import { cardRow, countOwnerPacks, listPacks, nextPosition } from "@/lib/data/lessons";
import { LESSON_LIMITS } from "@/lib/lessons/rules";
import { db } from "@/lib/supabase/admin";
import { adminImportSchema, describeImportIssue } from "@/lib/validation/lessons";

/**
 * 공용 교안 JSON 가져오기 (관리자): `{ packs: [{ title, intro, categories, cards: [...] }] }`
 * - 이미 있는 공용 묶음과 제목이 같으면(파일 안에서 겹쳐도) 하나도 만들지 않고 400으로 알려요.
 * - 새 묶음은 게시 전 상태로 만들어져요. 확인한 뒤 게시해 주세요.
 */
export const POST = adminHandler({}, async ({ req, access }) => {
  let input;
  try {
    input = adminImportSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof ZodError) throw new ApiError(400, describeImportIssue(e), "invalid");
    throw new ApiError(400, "JSON 파일 형식이 올바르지 않아요.");
  }
  const d = db();
  const existing = must(await d.from("lesson_packs").select("title").is("owner_id", null)) as { title: string }[];
  const taken = new Set(existing.map((p) => p.title));
  const dup: string[] = [];
  const inFile = new Set<string>();
  for (const p of input.packs) {
    if (taken.has(p.title) || inFile.has(p.title)) dup.push(p.title);
    inFile.add(p.title);
  }
  if (dup.length) throw new ApiError(400, `같은 제목의 공용 묶음이 이미 있어요: ${[...new Set(dup)].join(", ")}`, "duplicate_title", { titles: [...new Set(dup)] });
  if ((await countOwnerPacks(null)) + input.packs.length > LESSON_LIMITS.ownerPacks) {
    throw new ApiError(400, `공용 교안 묶음은 ${LESSON_LIMITS.ownerPacks}개까지 둘 수 있어요.`);
  }

  let position = await nextPosition("lesson_packs", "owner_id", null);
  let cardTotal = 0;
  for (const p of input.packs) {
    const pack = must(
      await d.from("lesson_packs").insert({ owner_id: null, title: p.title, intro: p.intro, categories: p.categories, position: position++ }).select("id").single(),
    ) as { id: string };
    if (p.cards.length) must(await d.from("lesson_cards").insert(p.cards.map((c, i) => ({ pack_id: pack.id, ...cardRow(c), position: i }))));
    cardTotal += p.cards.length;
    await writeAudit(access, { action: "lesson.import", targetType: "lesson_pack", targetId: pack.id, targetLabel: p.title, meta: { cards: p.cards.length } });
  }
  return { imported: { packs: input.packs.length, cards: cardTotal }, packs: await listPacks("public", access.user.id, true) };
});
