"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import type { PdfViewProps } from "@/components/room/slides/pdf-view";
import type { Material } from "@/lib/types";

/** pdf.js는 브라우저에서만 동작해서 동적으로 불러와요. */
export const PdfView = dynamic<PdfViewProps>(() => import("@/components/room/slides/pdf-view"), {
  ssr: false,
  loading: () => <Loader2 className="m-auto size-8 animate-spin text-muted-foreground" aria-label="교안 뷰어 준비 중" />,
});

export async function countPdfPages(file: File) {
  const mod = await import("@/components/room/slides/pdf-view");
  return mod.countPdfPages(file);
}

const urlCache = new Map<string, { url: string; at: number }>();
const URL_TTL = 5 * 60 * 60 * 1000; // 서명 URL은 6시간 유효
const now = () => Date.now();

/**
 * 서명 URL은 다시 받아올 때마다 바뀌어서, 교안별로 처음 받은 URL을 유지해 PDF를 다시 내려받지 않게 해요.
 * (URL이 만료되기 전까지만)
 */
export function useStableMaterialUrl(material: Material | null | undefined) {
  if (!material?.url) return null;
  const hit = urlCache.get(material.id);
  if (hit && hit.url.split("?")[0] === material.url.split("?")[0]) {
    const age = now() - hit.at;
    if (age < URL_TTL) return hit.url;
  }
  urlCache.set(material.id, { url: material.url, at: now() });
  return material.url;
}
