"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Check, Copy, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { hostOf, splitPlaceholders, type LessonColor } from "@/lib/lessons/rules";
import type { LessonCard } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 팔레트 키 → 아이콘 칩 색 (연한 배경 + 진한 글자) */
export const LESSON_COLOR_CLASS: Record<LessonColor, string> = {
  indigo: "bg-primary-soft text-primary-ink",
  coral: "bg-coral-soft text-coral-ink",
  purple: "bg-lilac-soft text-lilac-ink",
  green: "bg-mint-soft text-success",
  blue: "bg-sky-soft text-sky-ink",
  orange: "bg-sun-soft text-warning",
  slate: "bg-sunken text-muted-foreground",
  red: "bg-destructive-soft text-destructive",
};

export function LessonIcon({ icon, color, className }: { icon: string; color: LessonColor; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-base leading-none font-bold", LESSON_COLOR_CLASS[color], className)}>
      {icon}
    </span>
  );
}

/** 카드 편집 도구 (강사 편집 모드·라이브러리). 없으면 보기 전용이에요. */
export type LessonCardTools = {
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleHidden?: () => void;
};

const CARD = "flex h-full flex-col gap-2 rounded-lg border border-border/70 bg-surface p-4 text-left shadow-card";

function CardHead({ card }: { card: LessonCard }) {
  return (
    <div className="flex items-start gap-3">
      <LessonIcon icon={card.icon} color={card.color} />
      <div className="min-w-0 flex-1">
        <p className="leading-snug font-semibold break-words text-foreground">
          {card.name}
          {card.org && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{card.org}</span>}
        </p>
        {card.description && <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">{card.description}</p>}
      </div>
    </div>
  );
}

/**
 * 교안 카드
 * - 링크: 카드 전체가 새 탭 링크예요. 편집 중에는 실수로 열리지 않게 링크를 꺼요.
 * - 복사: [복사하기] + "내용 보기". 본문은 글자로만 보여 주고(HTML 해석 안 함), `[ ... ]`는 바꿀 곳이라 색으로 강조해요.
 */
export function LessonCardView({ card, tools }: { card: LessonCard; tools?: LessonCardTools }) {
  const hiddenCls = card.hidden && "opacity-55";
  if (card.kind === "link") {
    const host = card.url ? hostOf(card.url) : "";
    const inner = (
      <>
        <CardHead card={card} />
        <span className="mt-auto flex items-center gap-1 pt-1 text-xs text-muted-foreground">
          <span className="truncate">{host}</span>
          <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />
        </span>
      </>
    );
    return (
      <div className={cn("flex h-full flex-col", hiddenCls)}>
        {tools || !card.url ? (
          <div className={cn(CARD, "flex-1")}>{inner}</div>
        ) : (
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              CARD,
              "flex-1 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:hover:translate-y-0",
            )}
          >
            {inner}
            <span className="sr-only">(새 탭에서 열려요)</span>
          </a>
        )}
        {tools && <CardTools card={card} tools={tools} />}
      </div>
    );
  }
  return (
    <div className={cn("flex h-full flex-col", hiddenCls)}>
      <div className={cn(CARD, "flex-1")}>
        <CardHead card={card} />
        <CopyBody body={card.body ?? ""} name={card.name} />
      </div>
      {tools && <CardTools card={card} tools={tools} />}
    </div>
  );
}

function CopyBody({ body, name }: { body: string; name: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setState("copied");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 2000);
    } catch {
      // 클립보드가 막힌 환경(http, 권한 거부): 내용을 펼치고 전체 선택해서 직접 복사하게 해요.
      if (detailsRef.current) detailsRef.current.open = true;
      const pre = preRef.current;
      const sel = window.getSelection();
      if (pre && sel) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        sel.removeAllRanges();
        sel.addRange(range);
        pre.focus();
      }
      setState("manual");
    }
  };

  return (
    <div className="mt-auto space-y-2 pt-1">
      <div className="flex items-center gap-2">
        <Button size="sm" variant={state === "copied" ? "soft" : "outline"} onClick={copy} aria-label={state === "copied" ? `${name} 복사했어요` : `${name} 복사하기`}>
          {state === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
          {state === "copied" ? "복사했어요" : "복사하기"}
        </Button>
        <span role="status" aria-live="polite" className={cn("text-xs", state === "manual" ? "font-medium text-coral-ink" : "sr-only")}>
          {state === "copied" ? "복사했어요" : state === "manual" ? "Ctrl+C로 복사하세요" : ""}
        </span>
      </div>
      <details ref={detailsRef} className="group/details rounded-md bg-sunken/60">
        <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
          <span className="group-open/details:hidden">내용 보기</span>
          <span className="hidden group-open/details:inline">내용 접기</span>
        </summary>
        <pre ref={preRef} tabIndex={-1} className="scrollbar-thin max-h-72 overflow-y-auto px-3 pb-3 font-sans text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground outline-none">
          {splitPlaceholders(body).map((part, i) =>
            part.placeholder ? (
              <mark key={i} className="rounded-sm bg-sun-soft px-0.5 font-semibold text-warning">
                {part.text}
              </mark>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </pre>
      </details>
    </div>
  );
}

function CardTools({ card, tools }: { card: LessonCard; tools: LessonCardTools }) {
  return (
    <div className="mt-1 flex items-center gap-0.5 px-1" role="group" aria-label={`${card.name} 편집`}>
      {card.hidden && <span className="mr-auto rounded-sm bg-sunken px-1.5 py-0.5 text-xs font-medium text-muted-foreground">숨김</span>}
      <span className={cn("flex items-center gap-0.5", !card.hidden && "ml-auto")}>
        <Button variant="ghost" size="icon-sm" aria-label={`${card.name} 위로`} disabled={tools.first} onClick={() => tools.onMove(-1)}>
          <ArrowUp aria-hidden />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`${card.name} 아래로`} disabled={tools.last} onClick={() => tools.onMove(1)}>
          <ArrowDown aria-hidden />
        </Button>
        {tools.onToggleHidden && (
          <Button variant="ghost" size="icon-sm" aria-label={card.hidden ? `${card.name} 보이기` : `${card.name} 숨기기`} aria-pressed={card.hidden} onClick={tools.onToggleHidden}>
            {card.hidden ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" aria-label={`${card.name} 수정`} onClick={tools.onEdit}>
          <Pencil aria-hidden />
        </Button>
        <ConfirmButton title="카드를 삭제할까요?" description={`'${card.name}' 카드를 지워요. 되돌릴 수 없어요.`} confirmLabel="삭제" destructive onConfirm={tools.onDelete}>
          <Button variant="ghost" size="icon-sm" aria-label={`${card.name} 삭제`}>
            <Trash2 aria-hidden />
          </Button>
        </ConfirmButton>
      </span>
    </div>
  );
}
