/** 업로드 용도별 허용 타입·크기 (서버·클라이언트 공용) */
export const MB = 1024 * 1024;

export const UPLOAD_PURPOSES = ["chat", "submission", "material", "resource"] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

const IMAGE_TYPES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
};

const DOC_TYPES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "text/plain": ["txt", "md"],
  "text/csv": ["csv"],
  "application/zip": ["zip"],
  "application/x-zip-compressed": ["zip"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/msword": ["doc"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.ms-excel": ["xls"],
  "application/x-hwp": ["hwp"],
  "application/haansofthwp": ["hwp"],
  "application/vnd.hancom.hwp": ["hwp"],
  "application/vnd.hancom.hwpx": ["hwpx"],
  // 일부 브라우저는 hwp 등을 octet-stream으로 보내요. 이때는 확장자로만 허용해요.
  "application/octet-stream": ["hwp", "hwpx", "zip"],
};

export const PURPOSE_RULES: Record<UploadPurpose, { bucket: "materials" | "uploads"; maxBytes: number; types: Record<string, string[]>; label: string }> = {
  chat: { bucket: "uploads", maxBytes: 10 * MB, types: IMAGE_TYPES, label: "이미지" },
  submission: { bucket: "uploads", maxBytes: 10 * MB, types: { ...IMAGE_TYPES, ...DOC_TYPES }, label: "이미지·문서" },
  resource: { bucket: "uploads", maxBytes: 10 * MB, types: { ...IMAGE_TYPES, ...DOC_TYPES }, label: "자료 파일" },
  material: { bucket: "materials", maxBytes: 30 * MB, types: { "application/pdf": ["pdf"] }, label: "PDF" },
};

export function fileExtension(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** MIME + 확장자를 함께 확인해요. 문제가 있으면 한국어 안내 문구를 돌려줘요. */
export function validateUpload(purpose: UploadPurpose, file: { name: string; type: string; size: number }): string | null {
  const rule = PURPOSE_RULES[purpose];
  const ext = fileExtension(file.name);
  const mime = (file.type || "application/octet-stream").toLowerCase();
  const allowedExts = rule.types[mime];
  if (!allowedExts || !allowedExts.includes(ext)) {
    return `올릴 수 없는 파일 형식이에요. (${rule.label}만 가능)`;
  }
  if (file.size <= 0) return "빈 파일은 올릴 수 없어요.";
  if (file.size > rule.maxBytes) return `파일이 너무 커요. ${Math.round(rule.maxBytes / MB)}MB 이하로 올려 주세요.`;
  return null;
}

export function isImageMime(mime: string | null | undefined) {
  return Boolean(mime && mime.startsWith("image/"));
}
