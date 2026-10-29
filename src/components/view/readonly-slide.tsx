"use client";

import { PdfView } from "@/components/room/slides/pdf";

export function ReadonlySlide({ url, page, title }: { url: string; page: number; title: string }) {
  return (
    <div className="flex aspect-video items-center justify-center rounded-xl bg-[#f1eff8] p-2">
      <PdfView url={url} page={page} title={title} />
    </div>
  );
}
