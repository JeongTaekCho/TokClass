"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2 } from "lucide-react";

import { useElementSize } from "@/hooks/use-element-size";

// 워커는 scripts/copy-pdf-worker.mjs가 public/으로 복사해 둬요 (같은 모듈에서 설정해야 해요).
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export type PdfViewProps = {
  url: string;
  page: number;
  onLoad?: (numPages: number) => void;
  /** 세로 공간을 꽉 채우지 않고 너비에만 맞출지 */
  fitWidthOnly?: boolean;
  title?: string;
};

export default function PdfView({ url, page, onLoad, fitWidthOnly = false, title }: PdfViewProps) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const [aspect, setAspect] = useState(16 / 9);
  const [failed, setFailed] = useState(false);

  const maxW = Math.max(0, size.width);
  const width = fitWidthOnly || size.height === 0 ? maxW : Math.min(maxW, size.height * aspect);

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center overflow-hidden" role="img" aria-label={title ? `${title} ${page}페이지` : `교안 ${page}페이지`}>
      {failed ? (
        <p className="p-6 text-center text-muted-foreground">교안을 불러오지 못했어요. 새로고침해 주세요.</p>
      ) : (
        <Document
          file={url}
          onLoadSuccess={(doc) => onLoad?.(doc.numPages)}
          onLoadError={(e) => {
            console.error("[pdf] 불러오기 실패", e);
            setFailed(true);
          }}
          loading={<Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="교안 불러오는 중" />}
          className="flex items-center justify-center"
        >
          {width > 0 && (
            <Page
              key={page}
              pageNumber={page}
              width={Math.floor(width)}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onLoadSuccess={(p) => setAspect(p.originalWidth / p.originalHeight)}
              loading={<div style={{ width: Math.floor(width), aspectRatio: aspect }} className="animate-pulse rounded-lg bg-muted" />}
              className="overflow-hidden rounded-lg shadow-soft"
            />
          )}
        </Document>
      )}
    </div>
  );
}

/** 업로드 전에 PDF 페이지 수를 브라우저에서 확인해요. */
export async function countPdfPages(file: File): Promise<number> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const n = doc.numPages;
  await doc.cleanup().catch(() => {});
  return n;
}
