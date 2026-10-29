"use client";

import { useRef } from "react";
import useSWR from "swr";

import { fetcher } from "@/lib/client/api";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Activity, ActivityResults } from "@/lib/types";

export type ActivityDetail = { activity: Activity; myResponse: Record<string, unknown> | null; myScore: number | null; results: ActivityResults | null };

/** 활동 하나의 상세 + 실시간 결과 */
export function useActivityDetail(activityId: string | null) {
  const { roomId, me } = useRoom();
  const key = activityId ? `/api/rooms/${roomId}/activities/${activityId}` : null;
  const swr = useSWR<ActivityDetail>(key, fetcher);
  const timer = useRef<number | null>(null);
  const refetchSoon = () => {
    if (timer.current) return;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      void swr.mutate();
    }, 600);
  };

  useRoomEvent("activity.results", ({ activityId: id, results }) => {
    if (id !== activityId) return;
    // 강사는 이름이 포함된 결과를, 아이디어 보드는 내 공감 여부를 다시 받아와야 해요.
    // 첫 응답이 오기 전에 덮어쓰면 SWR이 진행 중 요청 결과를 버려요. 데이터가 있을 때만 바로 반영합니다.
    if (me.kind === "participant" && results && results.type !== "ideas" && swr.data) {
      void swr.mutate({ ...swr.data, results }, { revalidate: false });
    } else refetchSoon();
  });
  useRoomEvent("activity.changed", ({ activity }) => {
    // 상태 변경 직후 결과 이벤트가 이어서 와요. 그 뒤에 다시 받아오도록 살짝 늦춰요.
    if (activity.id === activityId) refetchSoon();
  });
  return swr;
}
