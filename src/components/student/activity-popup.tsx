"use client";

import { useState } from "react";
import useSWR from "swr";
import { Sparkles } from "lucide-react";

import { ActivityRunner } from "@/components/room/activities/activity-runner";
import { ACTIVITY_LABELS } from "@/lib/activities/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetcher } from "@/lib/client/api";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Activity } from "@/lib/types";

/** 강사가 활동을 시작하면 팝업으로 떠요. 닫으면 화면 아래 버튼으로 다시 열 수 있어요. */
export function ActivityPopup() {
  const { roomId } = useRoom();
  const { data, mutate } = useSWR<{ activities: Activity[] }>(`/api/rooms/${roomId}/activities`, fetcher);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [lastEnded, setLastEnded] = useState<string | null>(null);

  useRoomEvent("activity.changed", ({ activity }) => {
    if (!data) void mutate();
    else
    void mutate(
      (prev) => {
        const list = prev?.activities ?? [];
        const exists = list.some((a) => a.id === activity.id);
        const next = activity.status === "draft" ? list.filter((a) => a.id !== activity.id) : exists ? list.map((a) => (a.id === activity.id ? activity : a)) : [...list, activity];
        return { activities: next };
      },
      { revalidate: false },
    );
    if (activity.status === "live") {
      setOpenId(activity.id);
      setDismissed((d) => {
        const n = new Set(d);
        n.delete(activity.id);
        return n;
      });
    }
    if (activity.status === "ended") setLastEnded(activity.id);
  });

  const live = data?.activities.find((a) => a.status === "live") ?? null;
  // 처음 들어왔을 때 진행 중인 활동이 있으면 자동으로 열어요
  const currentId = openId ?? (live && !dismissed.has(live.id) ? live.id : null);
  const current = data?.activities.find((a) => a.id === currentId) ?? null;
  const pill = live && currentId !== live.id ? live : !live && lastEnded && currentId !== lastEnded ? data?.activities.find((a) => a.id === lastEnded) : null;

  return (
    <>
      {pill && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4">
          <Button className="pointer-events-auto rounded-full shadow-lifted" onClick={() => setOpenId(pill.id)}>
            <Sparkles aria-hidden />
            {pill.status === "live" ? `진행 중: ${pill.title}` : `결과 보기: ${pill.title}`}
          </Button>
        </div>
      )}
      <Dialog
        open={Boolean(current)}
        onOpenChange={(o) => {
          if (!o && current) {
            setDismissed((d) => new Set(d).add(current.id));
            setOpenId(null);
            if (current.status === "ended") setLastEnded(null);
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] sm:max-w-xl">
          {current && (
            <>
              <DialogHeader>
                <p className="text-sm font-semibold text-primary">
                  {ACTIVITY_LABELS[current.type].emoji} {ACTIVITY_LABELS[current.type].name}
                  {current.status === "live" ? " · 진행 중" : " · 종료"}
                </p>
                <DialogTitle className="text-xl">{current.title}</DialogTitle>
                <DialogDescription className="sr-only">강사가 시작한 활동이에요.</DialogDescription>
              </DialogHeader>
              <ActivityRunner key={current.id} activityId={current.id} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
