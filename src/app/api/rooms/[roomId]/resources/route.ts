import { must, roomHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { listResources } from "@/lib/data/resources";
import { broadcast } from "@/lib/realtime/server";
import { assertRoomPath } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import { resourceCreateSchema } from "@/lib/validation/slides";

export const GET = roomHandler({ allowEnded: true }, async ({ roomId }) => ({ resources: await listResources(roomId) }));

export const POST = roomHandler({ roles: ["instructor"], body: resourceCreateSchema, allowEnded: true }, async ({ roomId, body }) => {
  if (body.kind === "file") {
    try {
      assertRoomPath(roomId, body.path, "resource");
    } catch {
      throw new ApiError(400, "파일을 다시 올려 주세요.");
    }
    must(await db().from("resources").insert({ room_id: roomId, kind: "file", title: body.title, storage_path: body.path, size_bytes: body.sizeBytes }));
  } else {
    if (!/^https?:\/\//i.test(body.url)) throw new ApiError(400, "http(s) 링크만 넣을 수 있어요.");
    must(await db().from("resources").insert({ room_id: roomId, kind: "link", title: body.title, url: body.url }));
  }
  await broadcast(roomId, "resource.changed", {});
  return { resources: await listResources(roomId) };
});
