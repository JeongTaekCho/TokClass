import "server-only";

import { must } from "@/lib/api/handler";
import { BUCKETS, signedUrls } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import type { Resource } from "@/lib/types";

type Row = { id: string; kind: "file" | "link"; title: string; url: string | null; storage_path: string | null; size_bytes: number; created_at: string };

export async function listResources(roomId: string): Promise<Resource[]> {
  const rows = must(await db().from("resources").select("*").eq("room_id", roomId).order("created_at")) as Row[];
  const urls = await signedUrls(BUCKETS.uploads, rows.map((r) => r.storage_path), 3600, true);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    url: r.kind === "link" ? r.url : r.storage_path ? (urls.get(r.storage_path) ?? null) : null,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at,
  }));
}
