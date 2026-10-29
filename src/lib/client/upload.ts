"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { api, ClientApiError } from "@/lib/client/api";
import { compressImage } from "@/lib/client/image";
import { validateUpload, type UploadPurpose } from "@/lib/validation/files";

let storageClient: SupabaseClient | null = null;
function storage() {
  if (!storageClient) {
    storageClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return storageClient;
}

export type UploadedFile = { path: string; name: string; mime: string; size: number };

/** 검증 → (이미지면 압축) → 서명 업로드 URL 발급 → Storage로 직접 업로드 */
export async function uploadFile(roomId: string, purpose: UploadPurpose, original: File): Promise<UploadedFile> {
  const file = original.type.startsWith("image/") ? await compressImage(original) : original;
  const problem = validateUpload(purpose, { name: file.name, type: file.type, size: file.size });
  if (problem) throw new ClientApiError(400, problem);
  const mime = file.type || "application/octet-stream";
  const ticket = await api<{ bucket: string; path: string; token: string }>(`/api/rooms/${roomId}/uploads`, {
    body: { purpose, fileName: file.name, mime, size: file.size },
  });
  const { error } = await storage().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: mime });
  if (error) {
    console.error("[upload] 업로드 실패", error);
    throw new ClientApiError(500, "파일을 올리지 못했어요. 다시 시도해 주세요.");
  }
  return { path: ticket.path, name: original.name, mime, size: file.size };
}
