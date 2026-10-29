"use client";

import useSWR from "swr";
import { UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Group, Me } from "@/lib/types";

/** 조 모드 안내 + (수강생 선택 방식이면) 조 고르기 */
export function GroupBanner({ me }: { me: Me }) {
  const { roomId, room } = useRoom();
  const mode = room.settings.groups.mode;
  const show = room.settings.groups.active || mode === "choice";
  const { data, mutate } = useSWR<{ groups: Group[] }>(show ? `/api/rooms/${roomId}/groups` : null, fetcher);
  useRoomEvent("group.changed", () => void mutate());
  if (!show || me.kind !== "participant" || !data || data.groups.length === 0) return null;
  const mine = data.groups.find((g) => g.id === me.groupId) ?? null;

  if (mode === "choice" && (!mine || !room.settings.groups.active)) {
    return (
      <div className="border-b border-border bg-primary-soft/60 px-4 py-2.5">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <UsersRound className="size-4 text-primary" aria-hidden />
          {mine ? `${mine.name}를 골랐어요. 바꾸려면 다른 조를 눌러요.` : "함께할 조를 골라 주세요"}
        </p>
        <div className="scrollbar-thin flex gap-1.5 overflow-x-auto">
          {data.groups.map((g) => (
            <Button
              key={g.id}
              size="sm"
              variant={g.id === me.groupId ? "default" : "outline"}
              aria-pressed={g.id === me.groupId}
              onClick={async () => {
                try {
                  await api(`/api/rooms/${roomId}/groups/actions`, { body: { action: "choose", groupId: g.id } });
                } catch (e) {
                  toastError(e);
                }
              }}
            >
              {g.name} ({g.memberCount})
            </Button>
          ))}
        </div>
      </div>
    );
  }
  if (!room.settings.groups.active) return null;
  return (
    <p className="flex items-center gap-1.5 border-b border-border bg-primary-soft/60 px-4 py-2 text-sm">
      <UsersRound className="size-4 text-primary" aria-hidden />
      {mine ? (
        <>
          <strong>{mine.name}</strong> 조 활동 중이에요. 채팅 탭의 [우리 조 채팅]과 산출물은 우리 조끼리 보여요.
        </>
      ) : (
        "조 활동 중이에요. 강사님이 조를 정해 주실 거예요."
      )}
    </p>
  );
}
