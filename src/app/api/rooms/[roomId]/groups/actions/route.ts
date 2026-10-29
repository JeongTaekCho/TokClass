import { z } from "zod";

import { must, roomHandler } from "@/lib/api/handler";
import { ApiError, forbidden } from "@/lib/api/errors";
import { distribute, listGroups } from "@/lib/data/group-list";
import { broadcastMany } from "@/lib/realtime/server";
import { toPublicRoom } from "@/lib/rooms/public";
import { normalizeSettings } from "@/lib/rooms/templates";
import { db } from "@/lib/supabase/admin";
import type { RoomRow } from "@/lib/types";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assign-random") }),
  z.object({ action: z.literal("set-mode"), mode: z.enum(["random", "manual", "choice"]) }),
  z.object({ action: z.literal("set-member"), participantId: z.string().uuid(), groupId: z.string().uuid().nullable() }),
  z.object({ action: z.literal("choose"), groupId: z.string().uuid() }),
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("end") }),
]);

export const POST = roomHandler({ body: schema }, async ({ actor, roomId, body }) => {
  const d = db();
  const groups = await listGroups(roomId);
  const groupIds = new Set(groups.map((g) => g.id));
  const settings = normalizeSettings(actor.room.settings);

  if (body.action === "choose") {
    // 수강생이 직접 조 고르기 (선택 방식일 때만)
    if (actor.kind !== "participant") throw forbidden();
    if (settings.groups.mode !== "choice") throw new ApiError(403, "강사님이 조를 정해 줄 거예요.");
    if (!groupIds.has(body.groupId)) throw new ApiError(404, "조를 찾을 수 없어요.");
    must(await d.from("participants").update({ group_id: body.groupId }).eq("id", actor.participant.id));
    await broadcastMany(roomId, [{ event: "group.changed", payload: {} }]);
    return { groups: await listGroups(roomId) };
  }
  if (actor.kind !== "instructor") throw forbidden();

  let roomRow: RoomRow | null = null;
  const saveSettings = async () => {
    roomRow = must(await d.from("rooms").update({ settings }).eq("id", roomId).select("*").single()) as RoomRow;
  };

  switch (body.action) {
    case "assign-random": {
      if (groups.length < 2) throw new ApiError(400, "먼저 조를 2개 이상 만들어 주세요.");
      const people = must(await d.from("participants").select("id").eq("room_id", roomId).eq("kicked", false)) as { id: string }[];
      const buckets = distribute(people.map((p) => p.id), groups.length);
      for (let i = 0; i < buckets.length; i++) {
        if (buckets[i]!.length) must(await d.from("participants").update({ group_id: groups[i]!.id }).in("id", buckets[i]!));
      }
      settings.groups.mode = "random";
      await saveSettings();
      break;
    }
    case "set-mode":
      settings.groups.mode = body.mode;
      await saveSettings();
      break;
    case "set-member":
      if (body.groupId && !groupIds.has(body.groupId)) throw new ApiError(404, "조를 찾을 수 없어요.");
      must(await d.from("participants").update({ group_id: body.groupId }).eq("id", body.participantId).eq("room_id", roomId));
      break;
    case "start":
      if (groups.length < 2) throw new ApiError(400, "먼저 조를 2개 이상 만들어 주세요.");
      settings.groups.active = true;
      await saveSettings();
      break;
    case "end": {
      // 메인으로 합치기: 조별 산출물은 조 이름 섹션으로 남아요.
      settings.groups.active = false;
      settings.sections = [...new Set([...settings.sections, ...groups.map((g) => g.name)])].slice(0, 30);
      await saveSettings();
      break;
    }
  }

  const events: { event: "group.changed" | "room.updated"; payload: unknown }[] = [{ event: "group.changed", payload: {} }];
  if (roomRow) events.push({ event: "room.updated", payload: { room: toPublicRoom(roomRow) } });
  await broadcastMany(roomId, events);
  return { groups: await listGroups(roomId), settings };
});
