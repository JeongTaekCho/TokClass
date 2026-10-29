import "server-only";

import { db } from "@/lib/supabase/admin";

export const BUCKETS = { materials: "materials", uploads: "uploads" } as const;
export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

/** 여러 경로를 한 번에 서명 URL(기본 1시간)로 바꿔요. */
export async function signedUrls(bucket: Bucket, paths: (string | null | undefined)[], expiresIn = 3600, download = false) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data, error } = await db().storage.from(bucket).createSignedUrls(unique, expiresIn, download ? { download: true } : undefined);
  if (error) {
    console.error("[storage] 서명 URL 실패", error);
    return map;
  }
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}

export async function signedUrl(bucket: Bucket, path: string | null | undefined, expiresIn = 3600) {
  if (!path) return null;
  return (await signedUrls(bucket, [path], expiresIn)).get(path) ?? null;
}

/** 경로가 이 방의 폴더 안에 있는지 (다른 방 파일을 붙이는 것 방지) */
export function assertRoomPath(roomId: string, path: string, purpose?: string) {
  const prefix = purpose ? `${roomId}/${purpose}/` : `${roomId}/`;
  if (!path.startsWith(prefix) || path.includes("..") || !/^[0-9a-zA-Z/_.-]+$/.test(path)) {
    throw new Error("잘못된 파일 경로예요.");
  }
}

export async function removeFiles(bucket: Bucket, paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length === 0) return;
  const { error } = await db().storage.from(bucket).remove(list);
  if (error) console.error("[storage] 삭제 실패", error);
}

/** 방 폴더의 파일을 모두 지워요 (방 삭제·초기화) */
export async function removeRoomFiles(roomId: string, buckets: Bucket[] = [BUCKETS.materials, BUCKETS.uploads], keepFolders: string[] = []) {
  for (const bucket of buckets) {
    const storage = db().storage.from(bucket);
    const { data: folders } = await storage.list(roomId, { limit: 100 });
    for (const folder of folders ?? []) {
      if (keepFolders.includes(folder.name)) continue;
      const prefix = `${roomId}/${folder.name}`;
      // 폴더 안 파일 (최대 1000개씩)
      for (let i = 0; i < 20; i++) {
        const { data: files } = await storage.list(prefix, { limit: 1000 });
        if (!files || files.length === 0) break;
        await storage.remove(files.map((f) => `${prefix}/${f.name}`));
        if (files.length < 1000) break;
      }
    }
  }
}
