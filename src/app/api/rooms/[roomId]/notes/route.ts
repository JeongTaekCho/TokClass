import { isUuid, must, roomHandler } from "@/lib/api/handler";
import { ApiError, badRequest } from "@/lib/api/errors";
import { db } from "@/lib/supabase/admin";
import { noteSchema } from "@/lib/validation/slides";

/** 내 페이지 메모 (본인만) */
export const GET = roomHandler({ roles: ["participant"], allowEnded: true }, async ({ actor, roomId, search }) => {
  if (actor.kind !== "participant") throw new ApiError(403, "권한이 없어요.");
  const materialId = search.get("materialId");
  let q = db().from("notes").select("material_id, page, body, updated_at").eq("room_id", roomId).eq("participant_id", actor.participant.id).order("page");
  if (materialId) {
    if (!isUuid(materialId)) throw badRequest();
    q = q.eq("material_id", materialId);
  }
  const rows = must(await q) as { material_id: string; page: number; body: string; updated_at: string }[];
  return { notes: rows.map((r) => ({ materialId: r.material_id, page: r.page, body: r.body, updatedAt: r.updated_at })) };
});

export const PUT = roomHandler({ roles: ["participant"], body: noteSchema, allowEnded: true }, async ({ actor, roomId, body }) => {
  if (actor.kind !== "participant") throw new ApiError(403, "권한이 없어요.");
  const pid = actor.participant.id;
  if (!body.body.trim()) {
    must(await db().from("notes").delete().eq("participant_id", pid).eq("material_id", body.materialId).eq("page", body.page));
    return { ok: true };
  }
  const { data } = await db().from("materials").select("id").eq("id", body.materialId).eq("room_id", roomId).maybeSingle();
  if (!data) throw new ApiError(404, "교안을 찾을 수 없어요.");
  must(
    await db()
      .from("notes")
      .upsert({ participant_id: pid, material_id: body.materialId, page: body.page, room_id: roomId, body: body.body, updated_at: new Date().toISOString() }, { onConflict: "participant_id,material_id,page" }),
  );
  return { ok: true };
});
