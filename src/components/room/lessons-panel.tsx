"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { LessonBoard, type LessonEditor } from "@/components/lessons/lesson-board";
import { LessonFormDialog, type LessonCardValues, type LessonFormTarget, type LessonGroupValues } from "@/components/lessons/lesson-forms";
import { LessonImportDialog, type LessonImportBody } from "@/components/lessons/lesson-import-dialog";
import { Button } from "@/components/ui/button";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { moveItem } from "@/lib/lessons/rules";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { LessonCard, LessonGroup, RoomLessonGroup } from "@/lib/types";

type Data = { groups: RoomLessonGroup[] };

const tempId = () => `temp-${Math.random().toString(36).slice(2)}`;

/** 화면에 먼저 보여 줄 카드 (서버 응답이 오면 진짜 값으로 바뀌어요) */
function draftCard(v: LessonCardValues, id = tempId()): LessonCard {
  return {
    id,
    kind: v.kind,
    name: v.name,
    org: v.org,
    description: v.description,
    url: v.kind === "link" ? v.url : null,
    body: v.kind === "copy" ? v.body : null,
    icon: v.icon,
    color: v.color,
    category: v.category,
    hidden: false,
  };
}

/**
 * 교안 탭 (강사·수강생 같은 보드). manage면 강사에게 [편집] 토글이 보여요.
 * 편집은 먼저 화면에 반영하고(낙관적 업데이트) 서버 응답으로 맞춰요. 실패하면 되돌리고 알려요.
 */
export function LessonsPanel({ manage = false }: { manage?: boolean }) {
  const { roomId } = useRoom();
  const key = `/api/rooms/${roomId}/lessons`;
  const { data, mutate, isLoading } = useSWR<Data>(key, fetcher);
  useRoomEvent("lesson.changed", () => void mutate());
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<LessonFormTarget>(null);
  const groups = data?.groups ?? [];

  /** 낙관적 업데이트: optimistic으로 먼저 바꾸고, 서버가 돌려준 전체 목록으로 맞춰요. */
  const run = async (optimistic: (gs: RoomLessonGroup[]) => RoomLessonGroup[], request: () => Promise<Data>) => {
    try {
      await mutate(request, { optimisticData: (cur) => ({ groups: optimistic(cur?.groups ?? []) }), rollbackOnError: true, populateCache: true, revalidate: false });
      return true;
    } catch (e) {
      toastError(e);
      return false;
    }
  };
  const mapGroup = (id: string, fn: (g: RoomLessonGroup) => RoomLessonGroup) => (gs: RoomLessonGroup[]) => gs.map((g) => (g.id === id ? fn(g) : g));
  const reorder = (next: RoomLessonGroup[]) =>
    run(
      () => next,
      () => api<Data>(`${key}/reorder`, { body: { groups: next.map((g) => ({ id: g.id, cardIds: g.cards.map((c) => c.id) })) } }),
    );

  const editor: LessonEditor = {
    moveGroup: (g, dir) => {
      const i = groups.findIndex((x) => x.id === g.id);
      void reorder(moveItem(groups, i, dir));
    },
    editGroup: (g) => setForm({ type: "group", group: g }),
    deleteGroup: async (g) => {
      await run(
        (gs) => gs.filter((x) => x.id !== g.id),
        () => api<Data>(`${key}/groups/${g.id}`, { method: "DELETE" }),
      );
    },
    toggleGroupHidden: (g) =>
      void run(mapGroup(g.id, (x) => ({ ...x, hidden: !x.hidden })), () => api<Data>(`${key}/groups/${g.id}`, { method: "PATCH", body: { hidden: !g.hidden } })),
    groupMenu: [
      {
        label: "내 교안으로 저장",
        onSelect: async (g) => {
          try {
            const res = await api<{ pack: { title: string }; cardCount: number }>(`${key}/groups/${g.id}/save`, { body: {} });
            toast.success(`내 교안에 '${res.pack.title}' 묶음으로 저장했어요 (${res.cardCount}장).`);
          } catch (e) {
            toastError(e);
          }
        },
      },
    ],
    addCard: (g) => setForm({ type: "card", group: g }),
    editCard: (c, g) => setForm({ type: "card", group: g, card: c }),
    deleteCard: async (c, g) => {
      await run(
        mapGroup(g.id, (x) => ({ ...x, cards: x.cards.filter((y) => y.id !== c.id) })),
        () => api<Data>(`${key}/cards/${c.id}`, { method: "DELETE" }),
      );
    },
    moveCard: (c, g, dir) => {
      const i = g.cards.findIndex((x) => x.id === c.id);
      void reorder(groups.map((x) => (x.id === g.id ? { ...x, cards: moveItem(x.cards, i, dir) } : x)));
    },
    toggleCardHidden: (c, g) =>
      void run(
        mapGroup(g.id, (x) => ({ ...x, cards: x.cards.map((y) => (y.id === c.id ? { ...y, hidden: !y.hidden } : y)) })),
        () => api<Data>(`${key}/cards/${c.id}`, { method: "PATCH", body: { hidden: !c.hidden } }),
      ),
  };

  const submitGroup = async (v: LessonGroupValues, g?: LessonGroup) => {
    if (g) {
      await run(mapGroup(g.id, (x) => ({ ...x, ...v, cards: x.cards.map((c) => (c.category && !v.categories.includes(c.category) ? { ...c, category: null } : c)) })), () =>
        api<Data>(`${key}/groups/${g.id}`, { method: "PATCH", body: v }),
      );
    } else {
      await run(
        (gs) => [...gs, { id: tempId(), sourcePackId: null, hidden: false, cards: [], ...v }],
        () => api<Data>(`${key}/groups`, { body: v }),
      );
    }
  };
  const submitCard = async (v: LessonCardValues, g: LessonGroup, c?: LessonCard) => {
    if (c) {
      const { groupId, ...fields } = v;
      const moved = groupId && groupId !== g.id;
      await run(
        (gs) => {
          const updated = { ...draftCard(fields, c.id), hidden: c.hidden };
          if (!moved) return mapGroup(g.id, (x) => ({ ...x, cards: x.cards.map((y) => (y.id === c.id ? updated : y)) }))(gs);
          return gs.map((x) => (x.id === g.id ? { ...x, cards: x.cards.filter((y) => y.id !== c.id) } : x.id === groupId ? { ...x, cards: [...x.cards, updated] } : x));
        },
        () => api<Data>(`${key}/cards/${c.id}`, { method: "PATCH", body: { ...fields, ...(moved ? { groupId } : {}) } }),
      );
    } else {
      await run(mapGroup(g.id, (x) => ({ ...x, cards: [...x.cards, draftCard(v)] })), () => api<Data>(`${key}/cards`, { body: { ...v, groupId: g.id } }));
    }
  };
  const importFromLibrary = async (body: LessonImportBody) => {
    try {
      const res = await api<Data & { imported: number }>(`${key}/import`, { body });
      await mutate({ groups: res.groups }, { revalidate: false });
      toast.success(`카드 ${res.imported}장을 넣었어요.`);
      return true;
    } catch (e) {
      toastError(e);
      return false;
    }
  };

  const isEditing = manage && editing;
  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
      {isEditing && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-sunken p-3">
          <p className="mr-auto text-xs font-medium text-muted-foreground">편집 중 (강사만 보여요). 숨긴 묶음·카드는 수강생에게 안 보여요.</p>
          <LessonImportDialog groups={groups} onImport={importFromLibrary} />
          <Button variant="outline" size="sm" onClick={() => setForm({ type: "group" })}>
            <Plus aria-hidden /> 직접 만들기
          </Button>
        </div>
      )}
      <LessonBoard
        groups={groups}
        loading={isLoading}
        editor={isEditing ? editor : undefined}
        emptyHint={manage ? "[편집]을 눌러 라이브러리에서 가져오거나 직접 만들어 보세요." : undefined}
        toolbar={
          manage && (
            <Button variant={editing ? "default" : "outline"} aria-pressed={editing} onClick={() => setEditing(!editing)}>
              {editing ? <Check aria-hidden /> : <Pencil aria-hidden />}
              {editing ? "편집 끝" : "편집"}
            </Button>
          )
        }
      />
      {manage && (
        <LessonFormDialog
          target={form}
          onClose={() => setForm(null)}
          previewEndpoint={`/api/rooms/${roomId}/link-preview`}
          moveTargets={groups.map((g) => ({ id: g.id, title: g.title }))}
          onSubmitGroup={submitGroup}
          onSubmitCard={submitCard}
        />
      )}
    </div>
  );
}
