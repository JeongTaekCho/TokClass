import "server-only";

import { BUCKETS, signedUrls } from "@/lib/storage/server";
import type { ChatMessage } from "@/lib/types";

export type MessageRow = {
  id: string;
  room_id: string;
  group_id: string | null;
  participant_id: string | null;
  body: string;
  image_path: string | null;
  hidden: boolean;
  created_at: string;
  participant?: { nickname: string } | null;
};

export const MESSAGE_SELECT = "id, room_id, group_id, participant_id, body, image_path, hidden, created_at, participant:participants!messages_participant_id_fkey(nickname)";

export async function toChatMessages(rows: MessageRow[], viewer: "instructor" | "participant"): Promise<ChatMessage[]> {
  const urls = await signedUrls(
    BUCKETS.uploads,
    rows.filter((r) => !r.hidden || viewer === "instructor").map((r) => r.image_path),
  );
  return rows.map((r) => {
    const showContent = !r.hidden || viewer === "instructor";
    return {
      id: r.id,
      roomId: r.room_id,
      groupId: r.group_id,
      author: r.participant_id
        ? { kind: "participant", id: r.participant_id, nickname: r.participant?.nickname ?? "알 수 없음" }
        : { kind: "instructor", id: null, nickname: "강사" },
      body: showContent ? r.body : "",
      imageUrl: showContent && r.image_path ? (urls.get(r.image_path) ?? null) : null,
      hidden: r.hidden,
      createdAt: r.created_at,
    };
  });
}
