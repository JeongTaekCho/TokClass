"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Link2, Loader2 } from "lucide-react";

import { LESSON_COLOR_CLASS, LessonIcon } from "@/components/lessons/lesson-card";
import { useLinkPreviewFrom } from "@/components/room/link-preview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isHttpUrl, LESSON_COLOR_LABEL, LESSON_COLORS, type LessonColor, type LessonKind } from "@/lib/lessons/rules";
import type { LessonCard, LessonGroup } from "@/lib/types";
import { cn } from "@/lib/utils";
import { lessonCardSchema, lessonGroupCreateSchema, type LessonCardInput } from "@/lib/validation/lessons";

export type LessonGroupValues = { title: string; intro: string; categories: string[] };

/** 묶음 만들기·고치기: 이름, 소개 문구, 분류(쉼표로 나눠요) */
export function LessonGroupForm({ initial, onSubmit, onCancel }: { initial?: LessonGroup; onSubmit: (v: LessonGroupValues) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [intro, setIntro] = useState(initial?.intro ?? "");
  const [categories, setCategories] = useState((initial?.categories ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = lessonGroupCreateSchema.safeParse({ title, intro, categories: categories.split(",").map((c) => c.trim()).filter(Boolean) });
        if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
        setError(null);
        setPending(true);
        try {
          await onSubmit(parsed.data);
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="lg-title">묶음 이름</Label>
        <Input id="lg-title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="예: AI 도구 바로가기" autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lg-intro">소개 문구 (선택)</Label>
        <Textarea id="lg-intro" value={intro} maxLength={300} onChange={(e) => setIntro(e.target.value)} className="min-h-20" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lg-cats">분류 (선택)</Label>
        <Input id="lg-cats" value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="예: 글쓰기, 이미지, 코딩" aria-describedby="lg-cats-hint" />
        <p id="lg-cats-hint" className="text-xs text-muted-foreground">
          쉼표로 나눠 최대 20개까지. 분류가 있으면 수강생 화면에 분류 버튼이 생겨요.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {initial ? "저장" : "만들기"}
        </Button>
      </div>
    </form>
  );
}

export type LessonCardValues = LessonCardInput & { groupId?: string };

/**
 * 카드 만들기·고치기 (방 편집 모드·라이브러리 공용)
 * 링크 카드는 주소를 넣으면 미리보기로 이름·설명 빈 칸을 채워요. 이미 쓴 칸은 덮지 않아요.
 */
export function LessonCardForm({
  initial,
  group,
  moveTargets,
  previewEndpoint,
  onSubmit,
  onCancel,
}: {
  initial?: LessonCard;
  group: LessonGroup;
  /** 다른 묶음으로 옮길 수 있을 때 (방 편집 모드) */
  moveTargets?: { id: string; title: string }[];
  previewEndpoint: string;
  onSubmit: (v: LessonCardValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<LessonKind>(initial?.kind ?? "link");
  const [name, setName] = useState(initial?.name ?? "");
  const [org, setOrg] = useState(initial?.org ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [color, setColor] = useState<LessonColor>(initial?.color ?? "indigo");
  const [category, setCategory] = useState(initial?.category ?? "none");
  const [groupId, setGroupId] = useState(group.id);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // 주소 입력이 멈추면(0.6초) 미리보기를 받아요.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const { preview, isLoading: previewLoading } = useLinkPreviewFrom(previewEndpoint, kind === "link" ? previewUrl : null);
  // 받은 미리보기는 주소마다 한 번만 빈 칸에 채워요 (렌더 중에 이전 값과 비교해 맞추는 방식).
  const [filledFor, setFilledFor] = useState<string | null>(initial?.url ?? null);
  if (preview && previewUrl && filledFor !== previewUrl) {
    setFilledFor(previewUrl);
    if (!name.trim()) setName(preview.title.slice(0, 80));
    if (!description.trim() && preview.description) setDescription(preview.description.slice(0, 200));
    if (!icon.trim()) setIcon([...(preview.siteName || preview.title).trim()][0]?.toUpperCase() ?? "");
  }

  const categories = group.categories;
  const shownIcon = icon.trim() || (kind === "link" ? "🔗" : "📋");

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = lessonCardSchema.safeParse({ kind, name, org, description, url, body, icon: shownIcon, color, category: category === "none" ? null : category });
        if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.");
        setError(null);
        setPending(true);
        try {
          await onSubmit({ ...parsed.data, ...(moveTargets && groupId !== group.id ? { groupId } : {}) });
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="flex gap-1" role="radiogroup" aria-label="카드 종류">
        {(
          [
            ["link", Link2, "링크 카드", "누르면 새 탭으로 열려요"],
            ["copy", Copy, "복사 카드", "프롬프트·명령어를 복사해요"],
          ] as const
        ).map(([k, Icon, label, hint]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "flex flex-1 cursor-pointer items-start gap-2 rounded-lg border p-3 text-left transition-colors",
              kind === k ? "border-primary bg-primary-soft/60" : "border-border hover:bg-sunken/60",
            )}
          >
            <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", kind === k ? "text-primary" : "text-muted-foreground")} />
            <span>
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      {kind === "link" ? (
        <div className="space-y-1.5">
          <Label htmlFor="lc-url">링크 주소</Label>
          <div className="relative">
            <Input
              id="lc-url"
              type="url"
              inputMode="url"
              value={url}
              placeholder="https://"
              aria-invalid={(url.trim() !== "" && !isHttpUrl(url.trim())) || undefined}
              onChange={(e) => {
                const v = e.target.value;
                setUrl(v);
                if (timer.current) clearTimeout(timer.current);
                timer.current = setTimeout(() => setPreviewUrl(isHttpUrl(v.trim()) ? v.trim() : null), 600);
              }}
              autoFocus={!initial}
            />
            {previewLoading && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="미리보기 받는 중" />}
          </div>
          <p className="text-xs text-muted-foreground">주소를 넣으면 이름과 설명 빈 칸을 채워 드려요.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="lc-body">복사할 내용</Label>
          <Textarea id="lc-body" value={body} maxLength={20000} onChange={(e) => setBody(e.target.value)} className="min-h-40 font-mono text-sm" autoFocus={!initial} />
          <p className="text-xs text-muted-foreground">[대괄호] 부분은 수강생이 자기 상황으로 바꿀 곳이라 색으로 강조돼요.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div className="space-y-1.5">
          <Label htmlFor="lc-name">이름</Label>
          <Input id="lc-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lc-org">회사·기관 (선택)</Label>
          <Input id="lc-org" value={org} maxLength={40} onChange={(e) => setOrg(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lc-desc">설명 (선택)</Label>
        <Textarea id="lc-desc" value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} className="min-h-16" />
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="lc-icon">아이콘</Label>
          <div className="flex items-center gap-2">
            <LessonIcon icon={shownIcon} color={color} />
            <Input id="lc-icon" value={icon} maxLength={16} onChange={(e) => setIcon(e.target.value)} placeholder={kind === "link" ? "🔗" : "📋"} className="w-24" aria-describedby="lc-icon-hint" />
          </div>
          <p id="lc-icon-hint" className="text-xs text-muted-foreground">
            이모지나 글자 1~4자
          </p>
        </div>
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">색</legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="색">
            {LESSON_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={LESSON_COLOR_LABEL[c]}
                title={LESSON_COLOR_LABEL[c]}
                onClick={() => setColor(c)}
                className={cn("size-9 cursor-pointer rounded-[10px] border-2 transition-transform", LESSON_COLOR_CLASS[c], color === c ? "scale-105 border-foreground" : "border-transparent hover:scale-105")}
              >
                <span aria-hidden className="text-xs font-bold">
                  가
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {(categories.length > 0 || (moveTargets && moveTargets.length > 1)) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.length > 0 && (
            <div className="space-y-1.5">
              <Label>분류</Label>
              <Select value={category} onValueChange={setCategory} disabled={groupId !== group.id}>
                <SelectTrigger aria-label="분류">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">분류 없음</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {moveTargets && moveTargets.length > 1 && (
            <div className="space-y-1.5">
              <Label>묶음</Label>
              <Select
                value={groupId}
                onValueChange={(v) => {
                  setGroupId(v);
                  // 다른 묶음으로 옮기면 그 묶음 분류를 몰라서 분류를 비워요.
                  if (v !== group.id) setCategory("none");
                }}
              >
                <SelectTrigger aria-label="묶음">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {moveTargets.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {initial ? "저장" : "카드 만들기"}
        </Button>
      </div>
    </form>
  );
}

/** 지금 열린 편집 창 */
export type LessonFormTarget = { type: "group"; group?: LessonGroup } | { type: "card"; group: LessonGroup; card?: LessonCard } | null;

/** 묶음·카드 편집 창 (방 편집 모드·라이브러리 공용). 저장을 누르면 창을 닫고, 부모가 낙관적으로 반영해요. */
export function LessonFormDialog({
  target,
  onClose,
  previewEndpoint,
  moveTargets,
  onSubmitGroup,
  onSubmitCard,
}: {
  target: LessonFormTarget;
  onClose: () => void;
  previewEndpoint: string;
  moveTargets?: { id: string; title: string }[];
  onSubmitGroup: (v: LessonGroupValues, group?: LessonGroup) => Promise<void>;
  onSubmitCard: (v: LessonCardValues, group: LessonGroup, card?: LessonCard) => Promise<void>;
}) {
  const title = !target ? "" : target.type === "group" ? (target.group ? "묶음 고치기" : "새 묶음") : target.card ? "카드 고치기" : "새 카드";
  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{target?.type === "card" ? `'${target.group.title}' 묶음` : "묶음은 카드를 모아 두는 칸이에요."}</DialogDescription>
        </DialogHeader>
        {target?.type === "group" && (
          <LessonGroupForm
            key={target.group?.id ?? "new"}
            initial={target.group}
            onCancel={onClose}
            onSubmit={async (v) => {
              onClose();
              await onSubmitGroup(v, target.group);
            }}
          />
        )}
        {target?.type === "card" && (
          <LessonCardForm
            key={target.card?.id ?? `new-${target.group.id}`}
            initial={target.card}
            group={target.group}
            moveTargets={target.card ? moveTargets : undefined}
            previewEndpoint={previewEndpoint}
            onCancel={onClose}
            onSubmit={async (v) => {
              onClose();
              await onSubmitCard(v, target.group, target.card);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
