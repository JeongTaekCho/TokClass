import "server-only";

import { must } from "@/lib/api/handler";
import { BUCKETS, signedUrls } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import type { Material } from "@/lib/types";

type Row = { id: string; title: string; storage_path: string; page_count: number; size_bytes: number; created_at: string };

export async function listMaterials(roomId: string): Promise<Material[]> {
  const rows = must(await db().from("materials").select("id, title, storage_path, page_count, size_bytes, created_at").eq("room_id", roomId).order("position").order("created_at")) as Row[];
  const urls = await signedUrls(BUCKETS.materials, rows.map((r) => r.storage_path), 60 * 60 * 6);
  return rows.map((r) => ({ id: r.id, title: r.title, pageCount: r.page_count, sizeBytes: r.size_bytes, url: urls.get(r.storage_path) ?? null, createdAt: r.created_at }));
}
