import { instructorHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { withUniqueJoinCode } from "@/lib/rooms/join-code";
import { BUILTIN_TEMPLATES, defaultSettings, normalizeSettings, type BuiltinTemplate } from "@/lib/rooms/templates";
import { db } from "@/lib/supabase/admin";
import { roomCreateSchema } from "@/lib/validation/room";

export const POST = instructorHandler({ body: roomCreateSchema }, async ({ body, access }) => {
  const { user } = access;

  let template = "custom";
  let settings = defaultSettings("lecture");
  if ((BUILTIN_TEMPLATES as readonly string[]).includes(body.template)) {
    template = body.template;
    settings = defaultSettings(body.template as BuiltinTemplate);
  } else if (body.template.startsWith("tpl:")) {
    const { data: tpl } = await db()
      .from("room_templates")
      .select("settings")
      .eq("id", body.template.slice(4))
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!tpl) throw new ApiError(404, "템플릿을 찾을 수 없어요.");
    settings = normalizeSettings(tpl.settings);
    settings.groups = { active: false, mode: settings.groups.mode };
  }

  let startsAt: string | null = null;
  if (body.startsAt) {
    const d = new Date(body.startsAt);
    if (Number.isNaN(d.getTime())) throw new ApiError(400, "수업 일시를 확인해 주세요.");
    startsAt = d.toISOString();
  }

  const room = await withUniqueJoinCode<{ id: string; join_code: string }>(async (code) => {
    const { data, error } = await db()
      .from("rooms")
      .insert({ owner_id: user.id, title: body.title, starts_at: startsAt, capacity: body.capacity, template, join_code: code, settings })
      .select("id, join_code")
      .single();
    if (error?.code === "23505") return { ok: false };
    if (error) throw error;
    return { ok: true, value: data as { id: string; join_code: string } };
  });
  return { id: room.id, joinCode: room.join_code };
});
