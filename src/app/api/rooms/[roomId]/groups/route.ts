import { z } from "zod";

import { must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { listGroups } from "@/lib/data/group-list";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";

export const GET = roomHandler({ allowEnded: true }, async ({ roomId, actor }) => {
  return { groups: await listGroups(roomId), mode: actor.settings.groups.mode, active: actor.settings.groups.active };
});

/** 조 만들기: 기존 조를 지우고 N개 새로 만들어요 (조 활동 중에는 불가). */
export const POST = roomHandler(
  { roles: ["instructor"], body: z.object({ count: z.number().int().min(2, "조는 2개 이상이에요.").max(20, "조는 20개까지 만들 수 있어요."), prefix: z.string().trim().max(10).default("조") }) },
  async ({ roomId, actor, body }) => {
    if (actor.settings.groups.active) throw new ApiError(409, "조 활동 중에는 다시 편성할 수 없어요. 먼저 조 활동을 마쳐 주세요.");
    must(await db().from("participants").update({ group_id: null }).eq("room_id", roomId));
    must(await db().from("groups").delete().eq("room_id", roomId));
    const rows = Array.from({ length: body.count }, (_, i) => ({ room_id: roomId, name: `${i + 1}${body.prefix}`, position: i }));
    must(await db().from("groups").insert(rows));
    await broadcast(roomId, "group.changed", {});
    return { groups: await listGroups(roomId) };
  },
);

export const DELETE = roomHandler({ roles: ["instructor"] }, async ({ roomId, actor }) => {
  if (actor.settings.groups.active) throw new ApiError(409, "조 활동 중에는 지울 수 없어요.");
  must(await db().from("participants").update({ group_id: null }).eq("room_id", roomId));
  must(await db().from("groups").delete().eq("room_id", roomId));
  await broadcast(roomId, "group.changed", {});
  return { groups: [] };
});
