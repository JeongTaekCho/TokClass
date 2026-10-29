"use client";

import { useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { LayoutGrid, Loader2, Presentation } from "lucide-react";

import { PresentMode } from "@/components/room/board/present-mode";
import { SubmitDialog } from "@/components/room/board/submit-dialog";
import { SubmissionCard } from "@/components/room/board/submission-card";
import { SubmissionDetail } from "@/components/room/board/submission-detail";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/client/api";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Group, Me, PublicRoom, Submission } from "@/lib/types";

type Sort = "recent" | "popular";

export function BoardPanel({ readOnly = false, groupId = null }: { readOnly?: boolean; groupId?: string | null }) {
  const { roomId, room, me: initialMe } = useRoom();
  const [sort, setSort] = useState<Sort>("recent");
  const [mine, setMine] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [presenting, setPresenting] = useState<number | null>(null);
  const params = new URLSearchParams({ sort, ...(mine ? { mine: "1" } : {}), ...(section ? { section } : {}), ...(groupId ? { group: groupId } : {}) });
  const key = `/api/rooms/${roomId}/submissions?${params}`;
  const { data, mutate, isLoading } = useSWR<{ submissions: Submission[] }>(key, fetcher);
  const { data: meData } = useSWR<{ room: PublicRoom; me: Me }>(`/api/rooms/${roomId}`, fetcher, { revalidateOnFocus: false });
  const me = meData?.me ?? initialMe;
  const groupsActive = room.settings.groups.active;
  const { data: groupData } = useSWR<{ groups: Group[] }>(groupsActive || me.kind === "instructor" ? `/api/rooms/${roomId}/groups` : null, fetcher);
  const timer = useRef<number | null>(null);

  useRoomEvent("submission.changed", () => {
    if (timer.current) return;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      void mutate();
    }, 500);
  });
  useRoomEvent("group.changed", () => void mutate());

  const items = useMemo(() => data?.submissions ?? [], [data]);
  const open = items.find((s) => s.id === openId) ?? null;
  const myGroup = me.kind === "participant" && groupsActive ? groupData?.groups.find((g) => g.id === me.groupId) : null;
  const sectionChips = useMemo(() => {
    const set = new Set<string>(room.settings.sections);
    for (const g of groupData?.groups ?? []) set.add(g.name);
    for (const s of items) if (s.section) set.add(s.section);
    return [...set];
  }, [room.settings.sections, groupData, items]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
        {(["recent", "popular"] as const).map((s) => (
          <Button key={s} size="sm" variant={sort === s ? "soft" : "ghost"} aria-pressed={sort === s} onClick={() => setSort(s)}>
            {s === "recent" ? "최신순" : "인기순"}
          </Button>
        ))}
        <Button size="sm" variant={mine ? "soft" : "ghost"} aria-pressed={mine} onClick={() => setMine(!mine)}>
          내 것만
        </Button>
        <div className="ml-auto flex gap-1">
          {items.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setPresenting(0)}>
              <Presentation aria-hidden /> 발표 모드
            </Button>
          )}
          {!readOnly && <SubmitDialog groupLabel={myGroup?.name ?? null} onCreated={(s) => void mutate({ submissions: [s, ...items.filter((x) => x.id !== s.id)] }, { revalidate: false })} />}
        </div>
      </div>
      {sectionChips.length > 0 && (
        <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-border px-3 py-2" role="group" aria-label="섹션">
          <Button size="sm" variant={section === null ? "soft" : "ghost"} aria-pressed={section === null} onClick={() => setSection(null)}>
            전체
          </Button>
          {sectionChips.map((s) => (
            <Button key={s} size="sm" variant={section === s ? "soft" : "ghost"} aria-pressed={section === s} onClick={() => setSection(s)}>
              {s}
            </Button>
          ))}
        </div>
      )}

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-3">
        {isLoading && <Loader2 className="mx-auto mt-8 size-6 animate-spin text-muted-foreground" aria-label="불러오는 중" />}
        {!isLoading && items.length === 0 && (
          <div className="mt-10 flex flex-col items-center text-center text-muted-foreground">
            <LayoutGrid className="size-10 text-primary/50" aria-hidden />
            <p className="mt-2">{mine ? "아직 내가 올린 산출물이 없어요." : "첫 산출물을 올려 보세요!"}</p>
          </div>
        )}
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {items.map((s, i) => (
            <li key={s.id} className="flex">
              <SubmissionCard s={s} onOpen={() => setOpenId(s.id)} />
              <span className="sr-only">{i + 1}번째</span>
            </li>
          ))}
        </ul>
      </div>

      <SubmissionDetail
        submission={open}
        onClose={() => setOpenId(null)}
        onChanged={(s, removedId) => {
          if (removedId) void mutate({ submissions: items.filter((x) => x.id !== removedId) }, { revalidate: false });
          else if (s) void mutate({ submissions: items.map((x) => (x.id === s.id ? s : x)) }, { revalidate: false });
        }}
      />
      {presenting !== null && items.length > 0 && <PresentMode items={items.filter((s) => !s.hidden)} startIndex={presenting} onClose={() => setPresenting(null)} />}
    </div>
  );
}
