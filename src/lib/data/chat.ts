import "server-only";

import { groupReactions, type ReactionRow } from "@/lib/chat/reactions";
import { BUCKETS, signedUrls } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import type { ChatMessage, MessageReaction } from "@/lib/types";

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

const REACTION_SELECT = "message_id, participant_id, emoji, created_at, participant:participants(nickname)";

/** 아직 반응 테이블이 없을 때(마이그레이션 전)의 오류 코드: 채팅은 반응 없이 그대로 보여요. */
const MISSING_TABLE = new Set(["42P01", "PGRST205"]);

export async function loadReactions(messageIds: string[]): Promise<Map<string, MessageReaction[]>> {
  if (messageIds.length === 0) return new Map();
  const { data, error } = await db().from("message_reactions").select(REACTION_SELECT).in("message_id", messageIds);
  if (error) {
    if (!MISSING_TABLE.has(error.code)) console.error("[chat] 반응 불러오기 실패", error.message);
    return new Map();
  }
  return groupReactions(data as unknown as ReactionRow[]);
}

export async function toChatMessages(rows: MessageRow[], viewer: "instructor" | "participant", opts: { withReactions?: boolean } = {}): Promise<ChatMessage[]> {
  const [urls, reactions] = await Promise.all([
    signedUrls(
      BUCKETS.uploads,
      rows.filter((r) => !r.hidden || viewer === "instructor").map((r) => r.image_path),
    ),
    opts.withReactions === false ? Promise.resolve(new Map<string, MessageReaction[]>()) : loadReactions(rows.map((r) => r.id)),
  ]);
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
      reactions: showContent ? (reactions.get(r.id) ?? []) : [],
    };
  });
}
