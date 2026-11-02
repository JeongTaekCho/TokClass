"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowLeft, ChevronRight, Library, Loader2, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { NoResultsArt } from "@/components/illustrations";
import { LessonIcon } from "@/components/lessons/lesson-card";
import { ResourceListSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetcher } from "@/lib/client/api";
import type { LessonGroup, LessonPack, LessonPackSummary } from "@/lib/types";

export type LessonImportBody = { packId: string; cardIds?: string[]; targetGroupId?: string };

/**
 * 라이브러리에서 가져오기: 공용 교안 / 내 교안 → 묶음 → 카드 고르기.
 * [묶음 전체 넣기]는 새 그룹으로, [고른 카드 넣기]는 고른 그룹(또는 새 그룹)에 복사해요.
 */
export function LessonImportDialog({ groups, onImport }: { groups: LessonGroup[]; onImport: (body: LessonImportBody) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"public" | "mine">("public");
  const [query, setQuery] = useState("");
  const [packId, setPackId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState("new");
  const [busy, setBusy] = useState<"all" | "picked" | null>(null);

  const list = useSWR<{ packs: LessonPackSummary[] }>(open ? `/api/lessons/packs?scope=${scope}` : null, fetcher);
  const detail = useSWR<{ pack: LessonPack }>(open && packId ? `/api/lessons/packs/${packId}` : null, fetcher);
  const q = query.trim().toLowerCase();
  const packs = useMemo(() => (list.data?.packs ?? []).filter((p) => !q || p.title.toLowerCase().includes(q) || p.intro.toLowerCase().includes(q)), [list.data, q]);
  const pack = detail.data?.pack;

  const reset = () => {
    setPackId(null);
    setPicked(new Set());
    setTarget("new");
  };
  const run = async (kind: "all" | "picked") => {
    if (!pack) return;
    setBusy(kind);
    const ok = await onImport(
      kind === "all" ? { packId: pack.id } : { packId: pack.id, cardIds: [...picked], ...(target !== "new" ? { targetGroupId: target } : {}) },
    );
    setBusy(null);
    if (ok) {
      reset();
      setOpen(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Library aria-hidden /> 라이브러리에서 가져오기
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>라이브러리에서 가져오기</DialogTitle>
          <DialogDescription>카드를 복사해서 넣어요. 라이브러리를 나중에 고쳐도 이 수업은 바뀌지 않아요.</DialogDescription>
        </DialogHeader>

        {!packId ? (
          <div className="space-y-3">
            <Tabs value={scope} onValueChange={(v) => setScope(v as "public" | "mine")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="public">공용 교안</TabsTrigger>
                <TabsTrigger value="mine">내 교안</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="묶음 검색" aria-label="묶음 검색" className="pl-9" />
            </div>
            {list.isLoading && <ResourceListSkeleton />}
            {!list.isLoading && packs.length === 0 && (
              <EmptyState art={<NoResultsArt />} title={q ? "검색 결과가 없어요" : scope === "mine" ? "내 교안이 아직 없어요" : "공용 교안이 아직 없어요"}>
                {scope === "mine" && !q && "상단 메뉴 [교안]에서 만들거나, 방 교안 묶음 메뉴의 [내 교안으로 저장]으로 모을 수 있어요."}
              </EmptyState>
            )}
            <ul className="scrollbar-thin max-h-[50dvh] divide-y divide-border overflow-y-auto rounded-lg border border-border/70 empty:hidden">
              {packs.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setPackId(p.id)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.title}</span>
                      {p.intro && <span className="block truncate text-sm text-muted-foreground">{p.intro}</span>}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{p.cardCount}장</span>
                    <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={reset} className="-ml-2">
              <ArrowLeft aria-hidden /> 묶음 목록
            </Button>
            {detail.isLoading || !pack ? (
              <ResourceListSkeleton />
            ) : (
              <>
                <div>
                  <p className="font-semibold">{pack.title}</p>
                  {pack.intro && <p className="text-sm text-muted-foreground">{pack.intro}</p>}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id="lesson-pick-all"
                    checked={pack.cards.length > 0 && picked.size === pack.cards.length}
                    onCheckedChange={(v) => setPicked(v ? new Set(pack.cards.map((c) => c.id)) : new Set())}
                  />
                  <label htmlFor="lesson-pick-all" className="cursor-pointer">
                    모두 고르기 <span className="text-muted-foreground tabular-nums">({picked.size}/{pack.cards.length})</span>
                  </label>
                </div>
                <ul className="scrollbar-thin max-h-[40dvh] divide-y divide-border overflow-y-auto rounded-lg border border-border/70">
                  {pack.cards.map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-sunken/60">
                        <Checkbox
                          checked={picked.has(c.id)}
                          onCheckedChange={(v) =>
                            setPicked((prev) => {
                              const next = new Set(prev);
                              if (v) next.add(c.id);
                              else next.delete(c.id);
                              return next;
                            })
                          }
                        />
                        <LessonIcon icon={c.icon} color={c.color} className="size-8 text-sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{c.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.kind === "link" ? "링크" : "복사"}
                            {c.category && ` · ${c.category}`}
                            {c.description && ` · ${c.description}`}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                  {pack.cards.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">카드가 없는 묶음이에요.</li>}
                </ul>
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                  <Button variant="outline" disabled={busy !== null || pack.cards.length === 0} onClick={() => run("all")}>
                    {busy === "all" && <Loader2 className="animate-spin" aria-hidden />}묶음 전체 넣기
                  </Button>
                  <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
                  <Select value={target} onValueChange={setTarget}>
                    <SelectTrigger aria-label="넣을 묶음" className="h-11 w-auto min-w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">새 묶음으로</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button disabled={busy !== null || picked.size === 0} onClick={() => run("picked")}>
                    {busy === "picked" && <Loader2 className="animate-spin" aria-hidden />}고른 카드 넣기 ({picked.size})
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
