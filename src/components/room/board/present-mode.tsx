"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Trophy, X } from "lucide-react";

import { SubmissionContent } from "@/components/room/board/submission-detail";
import { Button } from "@/components/ui/button";
import { useKeyNav } from "@/hooks/use-key-nav";
import type { Submission } from "@/lib/types";

/** 발표 모드: 전체화면 슬라이드처럼 한 장씩 (←/→, Esc) */
export function PresentMode({ items, startIndex = 0, onClose }: { items: Submission[]; startIndex?: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  const ref = useRef<HTMLDivElement>(null);
  const s = items[Math.min(index, items.length - 1)];

  useKeyNav({
    prev: () => setIndex((i) => Math.max(0, i - 1)),
    next: () => setIndex((i) => Math.min(items.length - 1, i + 1)),
    escape: onClose,
  });

  useEffect(() => {
    const el = ref.current;
    el?.requestFullscreen?.().catch(() => {});
    el?.focus();
    const onFs = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onClose]);

  if (!s) return null;
  return createPortal(
    <div ref={ref} tabIndex={-1} className="fixed inset-0 z-[70] flex flex-col bg-[#14112b] text-white outline-none" role="dialog" aria-modal aria-label="발표 모드">
      <div className="flex items-center gap-3 px-6 py-4">
        <span className="text-sm text-white/70 tabular-nums">
          {index + 1} / {items.length}
        </span>
        <h2 className="flex min-w-0 flex-1 items-center gap-2 truncate text-xl font-bold">
          {s.isBest && <Trophy className="size-5 shrink-0 text-coral" aria-label="베스트" />}
          {s.title || "산출물"} <span className="text-base font-normal text-white/70">· {s.author.nickname}</span>
        </h2>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" aria-label="발표 모드 닫기 (Esc)" onClick={onClose}>
          <X aria-hidden />
        </Button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-20 pb-8">
        <div className="max-h-full w-full max-w-5xl overflow-auto rounded-2xl bg-white p-6 text-foreground">
          <SubmissionContent s={s} large />
        </div>
        <Button variant="ghost" size="icon" className="absolute top-1/2 left-4 size-14 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white" aria-label="이전 (←)" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          <ChevronLeft className="size-8" aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" className="absolute top-1/2 right-4 size-14 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white" aria-label="다음 (→)" disabled={index >= items.length - 1} onClick={() => setIndex(index + 1)}>
          <ChevronRight className="size-8" aria-hidden />
        </Button>
      </div>
    </div>,
    document.body,
  );
}
