import "server-only";

import type { Actor } from "@/lib/auth/actor";
import { must } from "@/lib/api/handler";
import { BUCKETS, signedUrls } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import type { Submission } from "@/lib/types";

export type SubmissionRow = {
  id: string;
  room_id: string;
  group_id: string | null;
  section: string | null;
  participant_id: string | null;
  kind: Submission["kind"];
  title: string;
  body: string;
  url: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime: string | null;
  size_bytes: number;
  is_best: boolean;
  hidden: boolean;
  sticker_count: number;
  comment_count: number;
  created_at: string;
  participant?: { nickname: string } | null;
};

export const SUBMISSION_SELECT = "*, participant:participants(nickname)";

export async function toSubmissions(rows: SubmissionRow[], actor: Actor | null): Promise<Submission[]> {
  const d = db();
  const ids = rows.map((r) => r.id);
  const [images, files] = await Promise.all([
    signedUrls(BUCKETS.uploads, rows.filter((r) => r.kind === "image").map((r) => r.storage_path), 3600),
    signedUrls(BUCKETS.uploads, rows.filter((r) => r.kind === "file").map((r) => r.storage_path), 3600, true),
  ]);
  const stickerRows = ids.length
    ? (must(await d.from("submission_stickers").select("submission_id, actor_key, sticker").in("submission_id", ids)) as { submission_id: string; actor_key: string; sticker: string }[])
    : [];
  const myKey = actor ? (actor.kind === "instructor" ? "instructor" : actor.participant.id) : null;
  const stickers = new Map<string, Record<string, number>>();
  const mine = new Map<string, string[]>();
  for (const s of stickerRows) {
    const m = stickers.get(s.submission_id) ?? {};
    m[s.sticker] = (m[s.sticker] ?? 0) + 1;
    stickers.set(s.submission_id, m);
    if (s.actor_key === myKey) mine.set(s.submission_id, [...(mine.get(s.submission_id) ?? []), s.sticker]);
  }
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    url: r.url,
    fileUrl: r.storage_path ? ((r.kind === "image" ? images : files).get(r.storage_path) ?? null) : null,
    fileName: r.file_name,
    mime: r.mime,
    section: r.section,
    groupId: r.group_id,
    author: r.participant_id ? { kind: "participant", id: r.participant_id, nickname: r.participant?.nickname ?? "알 수 없음" } : { kind: "instructor", id: null, nickname: "강사" },
    mine: actor?.kind === "participant" ? r.participant_id === actor.participant.id : actor?.kind === "instructor" ? r.participant_id === null : false,
    isBest: r.is_best,
    hidden: r.hidden,
    stickerCount: r.sticker_count,
    commentCount: r.comment_count,
    stickers: stickers.get(r.id) ?? {},
    myStickers: mine.get(r.id) ?? [],
    createdAt: r.created_at,
  }));
}

export async function loadSubmission(roomId: string, id: string) {
  return must(await db().from("submissions").select(SUBMISSION_SELECT).eq("id", id).eq("room_id", roomId).maybeSingle()) as unknown as SubmissionRow | null;
}

/** 수강생이 볼 수 있는 산출물인지 (숨김 X, 조 모드에서는 전체 + 우리 조) */
export function canSeeSubmission(row: SubmissionRow, actor: Actor) {
  if (actor.kind === "instructor") return true;
  if (row.hidden && row.participant_id !== actor.participant.id) return false;
  if (!row.group_id || !actor.settings.groups.active) return true;
  return row.group_id === actor.participant.group_id;
}
