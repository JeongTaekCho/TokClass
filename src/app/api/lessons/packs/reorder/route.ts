import { instructorHandler, must } from "@/lib/api/handler";
import { ApiError, forbidden } from "@/lib/api/errors";
import { writeAudit } from "@/lib/admin/server";
import { listPacks } from "@/lib/data/lessons";
import { diffOrder } from "@/lib/lessons/rules";
import { db } from "@/lib/supabase/admin";
import { packsReorderSchema } from "@/lib/validation/lessons";

/** 묶음 목록 순서 저장. mine은 내 묶음, public은 관리자만. */
export const POST = instructorHandler({ body: packsReorderSchema }, async ({ body, access }) => {
  const isPublic = body.scope === "public";
  if (isPublic && !access.profile.isAdmin) throw forbidden("공용 교안은 관리자만 고칠 수 있어요.");
  const d = db();
  let q = d.from("lesson_packs").select("id, position");
  q = isPublic ? q.is("owner_id", null) : q.eq("owner_id", access.user.id);
  const rows = must(await q) as { id: string; position: number }[];
  const parent = isPublic ? "public" : access.user.id;
  const now = new Map(rows.map((r) => [r.id, { parent, position: r.position }]));
  if (new Set(body.ids).size !== body.ids.length || body.ids.some((id) => !now.has(id))) throw new ApiError(400, "없는 묶음이 있어요. 새로고침해 주세요.");
  const changes = diffOrder([{ parent, ids: body.ids }], now);
  await Promise.all(changes.map((c) => d.from("lesson_packs").update({ position: c.position }).eq("id", c.id).then(must)));
  if (isPublic && changes.length) {
    await writeAudit(access, { action: "lesson.reorder", targetType: "lesson_pack", targetId: "public", targetLabel: "공용 교안 목록", meta: { packs: changes.length } });
  }
  return { packs: await listPacks(body.scope, access.user.id, isPublic) };
});
