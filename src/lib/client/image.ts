"use client";

const MAX_EDGE = 1920;

/** 업로드 전 이미지 리사이즈·압축 (긴 변 1920px, WebP → 안 되면 JPEG). GIF는 움직임 유지를 위해 그대로 둬요. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const toBlob = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob("image/webp", 0.85);
  let type = "image/webp";
  let ext = "webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob("image/jpeg", 0.85);
    type = "image/jpeg";
    ext = "jpg";
  }
  if (!blob) return file;
  // 압축 결과가 더 크면 원본 유지
  if (blob.size >= file.size && scale === 1) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, { type });
}
