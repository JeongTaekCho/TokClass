"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { ArrowDown, ArrowUp, CopyPlus, FileJson, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { ResourcesEmptyArt } from "@/components/illustrations";
import { LessonBoard, type LessonEditor } from "@/components/lessons/lesson-board";
import { LessonFormDialog, type LessonCardValues, type LessonFormTarget, type LessonGroupValues } from "@/components/lessons/lesson-forms";
import { ResourceListSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { moveItem } from "@/lib/lessons/rules";
import type { LessonCard, LessonPack, LessonPackSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminImportSchema, describeImportIssue } from "@/lib/validation/lessons";

type Scope = "mine" | "public";

/**
 * 교안 라이브러리
 * - instructor: 내 교안(만들기·고치기·순서) + 공용 교안 둘러보기·[내 교안으로 복사]
 * - admin: 공용 교안 전체(게시 전 포함) 관리 + JSON 가져오기
 * 카드 편집 폼은 방 편집 모드와 같은 걸 써요.
 */
export function LessonLibrary({ mode }: { mode: "instructor" | "admin" }) {
  const [tab, setTab] = useState<Scope>("mine");
  const scope: Scope = mode === "admin" ? "public" : tab;
  const editable = mode === "admin" || tab === "mine";
  const listKey = mode === "admin" ? "/api/lessons/packs?scope=public&all=1" : `/api/lessons/packs?scope=${tab}`;
  const list = useSWR<{ packs: LessonPackSummary[] }>(listKey, fetcher);
  const packs = list.data?.packs ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const selectedId = packs.some((p) => p.id === picked) ? picked : (packs[0]?.id ?? null);
  const detailKey = selectedId ? `/api/lessons/packs/${selectedId}` : null;
  const detail = useSWR<{ pack: LessonPack }>(detailKey, fetcher);
  const pack = detail.data?.pack ?? null;
  const [form, setForm] = useState<LessonFormTarget>(null);
  const [copying, setCopying] = useState(false);

  /** 묶음 안 변경: 먼저 반영하고 서버가 돌려준 묶음으로 맞춰요. 목록(카드 수·이름)은 뒤에서 다시 받아요. */
  const runPack = async (optimistic: (p: LessonPack) => LessonPack, request: () => Promise<{ pack: LessonPack }>) => {
    try {
      await detail.mutate(request, { optimisticData: (cur) => (cur ? { pack: optimistic(cur.pack) } : cur!), rollbackOnError: true, populateCache: true, revalidate: false });
      void list.mutate();
    } catch (e) {
      toastError(e);
    }
  };
  const runList = async (optimistic: (ps: LessonPackSummary[]) => LessonPackSummary[], request: () => Promise<{ packs: LessonPackSummary[] }>) => {
    try {
      await list.mutate(request, { optimisticData: (cur) => ({ packs: optimistic(cur?.packs ?? []) }), rollbackOnError: true, populateCache: true, revalidate: false });
    } catch (e) {
      toastError(e);
    }
  };
  const movePack = (id: string, dir: -1 | 1) => {
    const next = moveItem(packs, packs.findIndex((p) => p.id === id), dir);
    void runList(
      () => next,
      () => api(`/api/lessons/packs/reorder`, { body: { scope, ids: next.map((p) => p.id) } }),
    );
  };

  const editor: LessonEditor | undefined =
    editable && pack
      ? {
          editGroup: () => setForm({ type: "group", group: pack }),
          deleteGroup: async () => {
            try {
              await list.mutate(
                async () => {
                  await api(`/api/lessons/packs/${pack.id}`, { method: "DELETE" });
                  return { packs: packs.filter((p) => p.id !== pack.id) };
                },
                { optimisticData: { packs: packs.filter((p) => p.id !== pack.id) }, rollbackOnError: true, revalidate: true },
              );
              toast.success("묶음을 지웠어요.");
            } catch (e) {
              toastError(e);
            }
          },
          addCard: () => setForm({ type: "card", group: pack }),
          editCard: (c) => setForm({ type: "card", group: pack, card: c }),
          deleteCard: (c) =>
            runPack(
              (p) => ({ ...p, cards: p.cards.filter((x) => x.id !== c.id) }),
              () => api(`/api/lessons/cards/${c.id}`, { method: "DELETE" }),
            ),
          moveCard: (c, _g, dir) => {
            const cards = moveItem(pack.cards, pack.cards.findIndex((x) => x.id === c.id), dir);
            void runPack(
              (p) => ({ ...p, cards }),
              () => api(`/api/lessons/packs/${pack.id}/reorder`, { body: { cardIds: cards.map((x) => x.id) } }),
            );
          },
        }
      : undefined;

  const submitGroup = async (v: LessonGroupValues, g?: { id: string }) => {
    if (g && pack) {
      await runPack(
        (p) => ({ ...p, ...v }),
        () => api(`/api/lessons/packs/${pack.id}`, { method: "PATCH", body: v }),
      );
      return;
    }
    try {
      const res = await api<{ pack: LessonPack }>(`/api/lessons/packs`, { body: { ...v, scope } });
      await list.mutate();
      setPicked(res.pack.id);
      toast.success("새 묶음을 만들었어요.");
    } catch (e) {
      toastError(e);
    }
  };
  const submitCard = async (v: LessonCardValues, _g: unknown, c?: LessonCard) => {
    if (!pack) return;
    const draft: LessonCard = { id: c?.id ?? `temp-${Date.now()}`, hidden: false, ...v, url: v.kind === "link" ? v.url : null, body: v.kind === "copy" ? v.body : null };
    if (c) {
      await runPack(
        (p) => ({ ...p, cards: p.cards.map((x) => (x.id === c.id ? draft : x)) }),
        () => api(`/api/lessons/cards/${c.id}`, { method: "PATCH", body: v }),
      );
    } else {
      await runPack(
        (p) => ({ ...p, cards: [...p.cards, draft] }),
        () => api(`/api/lessons/packs/${pack.id}/cards`, { body: v }),
      );
    }
  };
  const setPublished = (on: boolean) => {
    if (!pack) return;
    void runPack(
      (p) => ({ ...p, isPublished: on }),
      () => api(`/api/lessons/packs/${pack.id}`, { method: "PATCH", body: { isPublished: on } }),
    );
  };
  const copyToMine = async () => {
    if (!pack) return;
    setCopying(true);
    try {
      await api(`/api/lessons/packs/${pack.id}/copy`, { body: {} });
      toast.success(`'${pack.title}'을(를) 내 교안으로 복사했어요.`);
    } catch (e) {
      toastError(e);
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="space-y-4">
      {mode === "instructor" && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Scope)}>
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="mine">내 교안</TabsTrigger>
            <TabsTrigger value="public">공용 교안</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      {mode === "admin" && <AdminImport onDone={() => void list.mutate()} />}

      <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-2 lg:sticky lg:top-20">
          {editable && (
            <Button variant="outline" className="w-full" onClick={() => setForm({ type: "group" })}>
              <Plus aria-hidden /> 새 묶음
            </Button>
          )}
          {list.isLoading && <ResourceListSkeleton />}
          {!list.isLoading && packs.length === 0 && <p className="px-1 py-4 text-sm text-muted-foreground">{scope === "mine" ? "아직 만든 묶음이 없어요." : "공용 교안이 아직 없어요."}</p>}
          <ul className="space-y-1" aria-label="교안 묶음">
            {packs.map((p, i) => (
              <li key={p.id} className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setPicked(p.id)}
                  aria-current={p.id === selectedId ? "true" : undefined}
                  className={cn(
                    "flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    p.id === selectedId ? "bg-primary-soft font-semibold text-primary-ink" : "hover:bg-sunken",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  {mode === "admin" && !p.isPublished && <Badge variant="secondary">게시 전</Badge>}
                  <span className="text-xs font-normal text-muted-foreground tabular-nums">{p.cardCount}</span>
                </button>
                {editable && (
                  <>
                    <Button variant="ghost" size="icon-sm" aria-label={`${p.title} 위로`} disabled={i === 0} onClick={() => movePack(p.id, -1)}>
                      <ArrowUp aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`${p.title} 아래로`} disabled={i === packs.length - 1} onClick={() => movePack(p.id, 1)}>
                      <ArrowDown aria-hidden />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </aside>

        <section aria-label="묶음 내용" className="min-w-0">
          {!selectedId && !list.isLoading && (
            <EmptyState art={<ResourcesEmptyArt />} title={editable ? "묶음을 만들어 보세요" : "둘러볼 공용 교안이 없어요"}>
              {editable ? "수업 중에 자주 여는 링크와 복사해 쓰는 프롬프트를 묶음으로 모아 두면, 방마다 바로 가져올 수 있어요." : "관리자가 공용 교안을 게시하면 여기에 보여요."}
            </EmptyState>
          )}
          {selectedId && (
            <>
              {pack && (mode === "admin" || !editable) && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-sunken p-3">
                  {mode === "admin" && (
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Switch checked={pack.isPublished} onCheckedChange={setPublished} aria-label="강사에게 게시" />
                      {pack.isPublished ? "게시 중 (승인된 강사 모두에게 보여요)" : "게시 전 (관리자만 보여요)"}
                    </label>
                  )}
                  <Button variant="outline" size="sm" className="ml-auto" disabled={copying} onClick={copyToMine}>
                    {copying ? <Loader2 className="animate-spin" aria-hidden /> : <CopyPlus aria-hidden />} 내 교안으로 복사
                  </Button>
                </div>
              )}
              <LessonBoard groups={pack ? [pack] : []} loading={detail.isLoading} editor={editor} idPrefix="library" emptyTitle="묶음을 불러오지 못했어요" />
            </>
          )}
        </section>
      </div>

      {editable && (
        <LessonFormDialog
          target={form}
          onClose={() => setForm(null)}
          previewEndpoint="/api/lessons/link-preview"
          onSubmitGroup={submitGroup}
          onSubmitCard={(v, g, c) => submitCard(v, g, c)}
        />
      )}
    </div>
  );
}

/** 관리자: JSON 파일 → 미리보기(묶음·카드 수) → 가져오기. 새 묶음은 게시 전 상태로 들어가요. */
function AdminImport({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; raw: unknown; packs: { title: string; cards: number }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cards = file?.packs.reduce((n, p) => n + p.cards, 0) ?? 0;

  return (
    <div className="rounded-lg border border-border/70 bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <p className="font-semibold">JSON 가져오기</p>
          <p className="text-sm text-muted-foreground">
            <code className="text-xs">{"{ packs: [{ title, intro, categories, cards: [...] }] }"}</code> 형식이에요. 같은 제목이 있으면 가져오지 않아요.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setError(null);
            setFile(null);
            try {
              const raw = JSON.parse(await f.text());
              const parsed = adminImportSchema.safeParse(raw);
              if (!parsed.success) return setError(describeImportIssue(parsed.error));
              setFile({ name: f.name, raw, packs: parsed.data.packs.map((p) => ({ title: p.title, cards: p.cards.length })) });
            } catch {
              setError("JSON 파일을 읽지 못했어요. 형식을 확인해 주세요.");
            }
          }}
        />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <FileJson aria-hidden /> 파일 선택
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {file && (
        <div className="mt-3 space-y-2 rounded-md bg-sunken p-3 text-sm">
          <p>
            <strong>{file.name}</strong> · 묶음 <strong className="tabular-nums">{file.packs.length}</strong>개 · 카드 <strong className="tabular-nums">{cards}</strong>장
          </p>
          <ul className="list-inside list-disc text-muted-foreground">
            {file.packs.slice(0, 10).map((p, i) => (
              <li key={i}>
                {p.title} ({p.cards}장)
              </li>
            ))}
            {file.packs.length > 10 && <li>외 {file.packs.length - 10}개</li>}
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
              취소
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await api<{ imported: { packs: number; cards: number } }>("/api/admin/lessons/import", { body: file.raw });
                  toast.success(`묶음 ${res.imported.packs}개, 카드 ${res.imported.cards}장을 가져왔어요. 확인한 뒤 게시해 주세요.`);
                  setFile(null);
                  onDone();
                } catch (e) {
                  toastError(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy && <Loader2 className="animate-spin" aria-hidden />}가져오기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
