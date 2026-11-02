"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { NoResultsArt, ResourcesEmptyArt } from "@/components/illustrations";
import { LessonCardView } from "@/components/lessons/lesson-card";
import { LessonGridSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { LessonCard, LessonGroup } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 편집 도구 (강사 편집 모드·라이브러리). 없는 기능은 버튼이 안 보여요. */
export type LessonEditor = {
  moveGroup?: (g: LessonGroup, dir: -1 | 1) => void;
  editGroup: (g: LessonGroup) => void;
  deleteGroup: (g: LessonGroup) => void;
  toggleGroupHidden?: (g: LessonGroup) => void;
  /** 묶음 메뉴 항목 (예: 내 교안으로 저장) */
  groupMenu?: { label: string; onSelect: (g: LessonGroup) => void }[];
  addCard: (g: LessonGroup) => void;
  editCard: (c: LessonCard, g: LessonGroup) => void;
  deleteCard: (c: LessonCard, g: LessonGroup) => void;
  moveCard: (c: LessonCard, g: LessonGroup, dir: -1 | 1) => void;
  toggleCardHidden?: (c: LessonCard, g: LessonGroup) => void;
};

function matches(c: LessonCard, q: string) {
  return [c.name, c.org ?? "", c.description, c.body ?? ""].some((t) => t.toLowerCase().includes(q));
}

const GRID = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

/**
 * 교안 보드 (수강생·읽기 전용·복습·강사·라이브러리 공용)
 * 위쪽 묶음 바로가기 칩 + 검색, 묶음마다 제목·소개·분류 필터·카드 그리드.
 * editor를 주면 편집 도구가 붙고, 숨긴 묶음·카드도 흐리게 보여요.
 */
export function LessonBoard({
  groups,
  editor,
  loading = false,
  emptyTitle = "아직 교안이 없어요",
  emptyHint,
  idPrefix = "lesson",
  toolbar,
}: {
  groups: LessonGroup[];
  editor?: LessonEditor;
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: React.ReactNode;
  /** 한 화면에 보드가 여러 개일 때 바로가기 앵커 id가 겹치지 않게 해요. */
  idPrefix?: string;
  /** 검색창 옆 (강사: 편집 토글 등) */
  toolbar?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const q = query.trim().toLowerCase();

  const visible = useMemo(
    () => (q ? groups.map((g) => ({ ...g, cards: g.cards.filter((c) => matches(c, q)) })).filter((g) => g.cards.length > 0) : groups),
    [groups, q],
  );
  const anchor = (id: string) => `${idPrefix}-group-${id}`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름·설명·내용 검색" aria-label="교안 검색" className="pl-9" />
          </div>
          {toolbar}
        </div>
        {groups.length > 1 && (
          <div className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="group" aria-label="교안 묶음 바로가기">
            {groups.map((g) => (
              <Button
                key={g.id}
                size="sm"
                variant={active === g.id ? "soft" : "ghost"}
                aria-pressed={active === g.id}
                className={cn("shrink-0", g.hidden && "opacity-60")}
                onClick={() => {
                  setActive(g.id);
                  document.getElementById(anchor(g.id))?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {g.title}
              </Button>
            ))}
          </div>
        )}
      </div>

      {loading && <LessonGridSkeleton />}
      {!loading && groups.length === 0 && (
        <EmptyState art={<ResourcesEmptyArt />} title={emptyTitle}>
          {emptyHint ?? "강사님이 교안을 넣으면 여기에서 바로 열거나 복사할 수 있어요."}
        </EmptyState>
      )}
      {!loading && groups.length > 0 && visible.length === 0 && (
        <EmptyState art={<NoResultsArt />} title="검색 결과가 없어요">
          다른 낱말로 찾아보세요.
        </EmptyState>
      )}

      {!loading &&
        visible.map((g) => {
          const index = groups.findIndex((x) => x.id === g.id);
          return <GroupSection key={g.id} group={g} anchorId={anchor(g.id)} editor={editor} first={index === 0} last={index === groups.length - 1} searching={Boolean(q)} />;
        })}
    </div>
  );
}

function GroupSection({ group: g, anchorId, editor, first, last, searching }: { group: LessonGroup; anchorId: string; editor?: LessonEditor; first: boolean; last: boolean; searching: boolean }) {
  const [filter, setFilter] = useState<string | null>(null);
  const categories = g.categories.filter((c) => g.cards.some((card) => card.category === c) || editor);
  const current = filter && categories.includes(filter) ? filter : null;
  const shown = current ? g.cards.filter((c) => c.category === current) : g.cards;
  const uncategorized = g.cards.filter((c) => !c.category || !g.categories.includes(c.category));
  // 분류별 소제목은 [전체]를 보고 있을 때만 나눠요.
  const sections =
    !current && categories.length > 0
      ? [...categories.map((c) => ({ key: c, title: c, cards: g.cards.filter((card) => card.category === c) })), { key: "", title: "기타", cards: uncategorized }].filter((s) => s.cards.length > 0)
      : [{ key: current ?? "", title: null, cards: shown }];

  const renderCard = (c: LessonCard) => {
    const i = g.cards.findIndex((x) => x.id === c.id);
    return (
      <li key={c.id}>
        <LessonCardView
          card={c}
          tools={
            editor && {
              first: i === 0,
              last: i === g.cards.length - 1,
              onMove: (dir) => editor.moveCard(c, g, dir),
              onEdit: () => editor.editCard(c, g),
              onDelete: () => editor.deleteCard(c, g),
              onToggleHidden: editor.toggleCardHidden && (() => editor.toggleCardHidden!(c, g)),
            }
          }
        />
      </li>
    );
  };

  const titleId = `${anchorId}-title`;
  return (
    <section id={anchorId} aria-labelledby={titleId} className={cn("scroll-mt-4 space-y-3", g.hidden && "opacity-60")}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="flex items-center gap-2 text-heading">
            {g.title}
            {g.hidden && <span className="rounded-sm bg-sunken px-1.5 py-0.5 text-xs font-medium text-muted-foreground">숨김</span>}
          </h2>
          {g.intro && <p className="mt-0.5 text-sm whitespace-pre-wrap text-muted-foreground">{g.intro}</p>}
        </div>
        {editor && <GroupTools group={g} editor={editor} first={first} last={last} />}
      </div>

      {categories.length > 0 && !searching && (
        <div className="scrollbar-thin flex gap-1 overflow-x-auto" role="group" aria-label={`${g.title} 분류`}>
          <Button size="sm" variant={current === null ? "soft" : "ghost"} aria-pressed={current === null} onClick={() => setFilter(null)} className="shrink-0">
            전체 <span className="tabular-nums opacity-70">{g.cards.length}</span>
          </Button>
          {categories.map((c) => (
            <Button key={c} size="sm" variant={current === c ? "soft" : "ghost"} aria-pressed={current === c} onClick={() => setFilter(c)} className="shrink-0">
              {c} <span className="tabular-nums opacity-70">{g.cards.filter((card) => card.category === c).length}</span>
            </Button>
          ))}
        </div>
      )}

      {g.cards.length === 0 && <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">아직 카드가 없어요.</p>}
      {sections.map((s) =>
        s.title ? (
          <div key={`c:${s.key}`} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{s.title}</h3>
            <ul className={GRID}>{s.cards.map(renderCard)}</ul>
          </div>
        ) : (
          s.cards.length > 0 && (
            <ul key={`all:${s.key}`} className={GRID}>
              {s.cards.map(renderCard)}
            </ul>
          )
        ),
      )}

      {editor && (
        <Button variant="outline" size="sm" onClick={() => editor.addCard(g)}>
          <Plus aria-hidden /> 카드 추가
        </Button>
      )}
    </section>
  );
}

function GroupTools({ group: g, editor, first, last }: { group: LessonGroup; editor: LessonEditor; first: boolean; last: boolean }) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={`${g.title} 묶음 편집`}>
      {editor.moveGroup && (
        <>
          <Button variant="ghost" size="icon-sm" aria-label={`${g.title} 묶음 위로`} disabled={first} onClick={() => editor.moveGroup!(g, -1)}>
            <ArrowUp aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`${g.title} 묶음 아래로`} disabled={last} onClick={() => editor.moveGroup!(g, 1)}>
            <ArrowDown aria-hidden />
          </Button>
        </>
      )}
      {editor.toggleGroupHidden && (
        <Button variant="ghost" size="icon-sm" aria-label={g.hidden ? `${g.title} 묶음 보이기` : `${g.title} 묶음 숨기기`} aria-pressed={g.hidden} onClick={() => editor.toggleGroupHidden!(g)}>
          {g.hidden ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </Button>
      )}
      <Button variant="ghost" size="icon-sm" aria-label={`${g.title} 묶음 수정`} onClick={() => editor.editGroup(g)}>
        <Pencil aria-hidden />
      </Button>
      <ConfirmButton
        title="묶음을 삭제할까요?"
        description={`'${g.title}' 묶음과 안의 카드 ${g.cards.length}장을 모두 지워요. 되돌릴 수 없어요.`}
        confirmLabel="삭제"
        destructive
        onConfirm={() => editor.deleteGroup(g)}
      >
        <Button variant="ghost" size="icon-sm" aria-label={`${g.title} 묶음 삭제`}>
          <Trash2 aria-hidden />
        </Button>
      </ConfirmButton>
      {editor.groupMenu && editor.groupMenu.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`${g.title} 묶음 메뉴`}>
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {editor.groupMenu.map((m) => (
              <DropdownMenuItem key={m.label} onSelect={() => m.onSelect(g)}>
                {m.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
