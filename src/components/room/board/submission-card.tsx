"use client";

import { ExternalLink, FileText, MessageCircle, Trophy } from "lucide-react";

import { useLinkPreview } from "@/components/room/link-preview";
import { MessageBody } from "@/components/room/message-body";
import type { Submission } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SubmissionCard({ s, onOpen }: { s: Submission; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className={cn(
        "group flex w-full cursor-pointer flex-col overflow-hidden rounded-md border bg-surface text-left transition-colors duration-150 hover:border-border-strong",
        s.isBest ? "border-2 border-coral hover:border-coral" : "border-border",
        s.hidden && "opacity-60",
      )}
      aria-haspopup="dialog"
    >
      {s.kind === "image" && s.fileUrl && <img src={s.fileUrl} alt="" loading="lazy" className="aspect-[4/3] w-full bg-sunken object-cover" />}
      {s.kind === "file" && (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-sunken p-4 text-center">
          <FileText className="size-9 text-muted-foreground" aria-hidden />
          <span className="line-clamp-2 text-sm font-medium break-all">{s.fileName}</span>
        </div>
      )}
      {s.kind === "link" && s.url && <LinkThumb url={s.url} />}
      {s.kind === "text" && (
        <div className="aspect-[4/3] w-full overflow-hidden bg-warning-soft p-4">
          <MessageBody text={s.body} className="line-clamp-[8] text-sm" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start gap-1.5">
          {s.isBest && <Trophy className="mt-0.5 size-4 shrink-0 text-coral-ink" aria-label="베스트" />}
          <p className="line-clamp-1 font-semibold">{s.title || (s.kind === "text" ? s.body.slice(0, 30) : "제목 없음")}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {s.author.nickname}
          {s.section && ` · ${s.section}`}
          {s.hidden && " · 숨김"}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          {Object.entries(s.stickers).map(([st, n]) => (
            <span key={st} className={cn("rounded-sm px-1.5 py-0.5", s.myStickers.includes(st) ? "bg-primary-soft" : "bg-sunken")}>
              {st} {n}
            </span>
          ))}
          {s.commentCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
              <MessageCircle className="size-3.5" aria-hidden /> {s.commentCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/** 링크 산출물 썸네일: 사이트 대표 이미지(og)와 제목. 이미지가 없으면 주소를 보여줘요. */
function LinkThumb({ url }: { url: string }) {
  const { preview, isLoading } = useLinkPreview(url);
  if (preview?.image) {
    return (
      <div className="relative aspect-[4/3] w-full bg-sunken">
        <img src={preview.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
        <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-ink/80 to-transparent px-2.5 pt-6 pb-2 text-xs font-medium text-white">
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{preview.siteName}</span>
        </span>
      </div>
    );
  }
  return (
    <div className={cn("flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-primary-soft p-4 text-center", isLoading && "animate-pulse")}>
      <ExternalLink className="size-7 text-primary-ink" aria-hidden />
      <span className="line-clamp-3 text-sm font-medium break-all text-primary-ink">{preview?.title ?? url}</span>
    </div>
  );
}
