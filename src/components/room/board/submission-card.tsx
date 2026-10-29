"use client";

import { ExternalLink, FileText, MessageCircle, Trophy } from "lucide-react";

import { MessageBody } from "@/components/room/message-body";
import type { Submission } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SubmissionCard({ s, onOpen }: { s: Submission; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className={cn(
        "group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lifted",
        s.isBest ? "border-coral ring-2 ring-coral/30" : "border-border",
        s.hidden && "opacity-60",
      )}
      aria-label={`${s.author.nickname}님의 ${s.title || "산출물"} 자세히 보기`}
    >
      {s.kind === "image" && s.fileUrl && <img src={s.fileUrl} alt="" loading="lazy" className="aspect-[4/3] w-full bg-muted object-cover" />}
      {s.kind === "file" && (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-primary-soft/40 p-4 text-center">
          <FileText className="size-10 text-primary" aria-hidden />
          <span className="line-clamp-2 text-sm font-semibold break-all">{s.fileName}</span>
        </div>
      )}
      {s.kind === "link" && (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-[#eef2ff] p-4 text-center">
          <ExternalLink className="size-8 text-brand-indigo" aria-hidden />
          <span className="line-clamp-3 text-sm font-medium break-all text-brand-indigo">{s.url}</span>
        </div>
      )}
      {s.kind === "text" && (
        <div className="aspect-[4/3] w-full overflow-hidden bg-[#fffbeb] p-4">
          <MessageBody text={s.body} className="line-clamp-[8] text-sm" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start gap-1.5">
          {s.isBest && <Trophy className="mt-0.5 size-4 shrink-0 text-coral" aria-label="베스트" />}
          <p className="line-clamp-1 font-semibold">{s.title || (s.kind === "text" ? s.body.slice(0, 30) : "제목 없음")}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {s.author.nickname}
          {s.section && ` · ${s.section}`}
          {s.hidden && " · 숨김"}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          {Object.entries(s.stickers).map(([st, n]) => (
            <span key={st} className={cn("rounded-full px-1.5 py-0.5", s.myStickers.includes(st) ? "bg-primary-soft" : "bg-muted")}>
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
