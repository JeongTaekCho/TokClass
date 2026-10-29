import { randomUUID } from "node:crypto";
import { z } from "zod";

import { roomHandler } from "@/lib/api/handler";
import { ApiError, forbidden } from "@/lib/api/errors";
import { db } from "@/lib/supabase/admin";
import { fileExtension, PURPOSE_RULES, UPLOAD_PURPOSES, validateUpload } from "@/lib/validation/files";

const schema = z.object({
  purpose: z.enum(UPLOAD_PURPOSES),
  fileName: z.string().min(1).max(200),
  mime: z.string().max(120),
  size: z.number().int().positive(),
});

/** 서명된 업로드 URL 발급: 파일은 브라우저가 Storage로 직접 올려요 (Next 서버를 거치지 않음). */
export const POST = roomHandler({ body: schema }, async ({ actor, body, roomId }) => {
  if ((body.purpose === "material" || body.purpose === "resource") && actor.kind !== "instructor") throw forbidden();
  const problem = validateUpload(body.purpose, { name: body.fileName, type: body.mime, size: body.size });
  if (problem) throw new ApiError(400, problem);

  const rule = PURPOSE_RULES[body.purpose];
  const path = `${roomId}/${body.purpose}/${randomUUID()}.${fileExtension(body.fileName)}`;
  const { data, error } = await db().storage.from(rule.bucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[uploads] 서명 업로드 URL 실패", error);
    throw new ApiError(500, "업로드를 준비하지 못했어요. 다시 시도해 주세요.");
  }
  return { bucket: rule.bucket, path: data.path, token: data.token };
});
