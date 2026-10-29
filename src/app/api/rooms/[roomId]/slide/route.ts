import { must, roomHandler } from "@/lib/api/handler";
import { notFound } from "@/lib/api/errors";
import { db } from "@/lib/supabase/admin";
import { slideSchema } from "@/lib/validation/slides";

/**
 * 강사의 현재 교안·페이지 저장. 실시간 전달은 강사 클라이언트가 채널로 바로 보내고(slide.page),
 * 여기서는 나중에 들어온 수강생을 위해 위치만 저장해요.
 */
export const POST = roomHandler({ roles: ["instructor"], body: slideSchema }, async ({ roomId, body }) => {
  const { data } = await db().from("materials").select("id").eq("id", body.materialId).eq("room_id", roomId).maybeSingle();
  if (!data) throw notFound("교안을 찾을 수 없어요.");
  must(await db().from("rooms").update({ current_material_id: body.materialId, current_page: body.page }).eq("id", roomId));
  return { ok: true };
});
