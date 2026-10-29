"use client";

import useSWR from "swr";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { SIGNALS } from "@/components/room/signal";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import { bucketUnderstanding } from "@/lib/report/aggregate";
import type { UnderstandingCounts } from "@/lib/types";
import { cn } from "@/lib/utils";

type Data = { counts: UnderstandingCounts; events: { participant_id: string; status: "green" | "yellow" | "red"; created_at: string }[] };
type ParticipantLite = { id: string; nickname: string; understanding: "green" | "yellow" | "red" | null; kicked: boolean };

export function UnderstandingPanel() {
  const { roomId, room } = useRoom();
  const { data, mutate } = useSWR<Data>(`/api/rooms/${roomId}/understanding`, fetcher);
  const { data: pData, mutate: mutateP } = useSWR<{ participants: ParticipantLite[] }>(`/api/rooms/${roomId}/participants`, fetcher);
  useRoomEvent("understanding.counts", ({ counts }) => {
    void mutate((prev) => (prev ? { ...prev, counts } : prev), { revalidate: false });
    void mutateP();
  });

  const counts = data?.counts ?? { green: 0, yellow: 0, red: 0, total: 0 };
  const responded = counts.green + counts.yellow + counts.red;
  const pct = (n: number) => (responded ? Math.round((n / responded) * 100) : 0);
  const redPct = pct(counts.red);
  const alert = responded > 0 && redPct >= room.settings.redThreshold;
  const people = (pData?.participants ?? []).filter((p) => !p.kicked);
  const trend = bucketUnderstanding(data?.events ?? [], 2 * 60_000).slice(-15);

  return (
    <div className="space-y-4">
      <div className={cn("rounded-2xl border p-4", alert ? "border-coral bg-coral-soft" : "border-border")}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold">지금 이해도</h3>
          <span className="text-sm text-muted-foreground">
            {responded}/{counts.total}명 응답
          </span>
        </div>
        {alert && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-[#b42318]" role="alert">
            <AlertTriangle className="size-4" aria-hidden /> 🔴 막힌 수강생이 {redPct}%예요 (기준 {room.settings.redThreshold}%)
          </p>
        )}
        <div className="mt-3 flex h-8 overflow-hidden rounded-xl bg-muted" role="img" aria-label={SIGNALS.map((s) => `${s.label} ${counts[s.status]}명`).join(", ")}>
          {SIGNALS.map((s) =>
            counts[s.status] > 0 ? (
              <div key={s.status} className={cn("flex items-center justify-center text-xs font-bold text-white transition-all", s.color)} style={{ width: `${pct(counts[s.status])}%` }}>
                {pct(counts[s.status]) >= 12 && `${pct(counts[s.status])}%`}
              </div>
            ) : null,
          )}
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          {SIGNALS.map((s) => (
            <li key={s.status} className={cn("rounded-xl border p-2", s.soft, s.status === "red" && alert && "ring-2 ring-coral")}>
              <span aria-hidden>{s.emoji}</span> {s.short}
              <span className="block text-lg font-extrabold">{counts[s.status]}명</span>
            </li>
          ))}
        </ul>
      </div>

      {trend.length > 1 && (
        <div>
          <h3 className="mb-1 text-sm font-bold">최근 30분 흐름</h3>
          <div className="flex h-16 items-end gap-0.5" role="img" aria-label="최근 이해도 흐름 막대">
            {trend.map((b) => {
              const t = b.green + b.yellow + b.red || 1;
              return (
                <div key={b.at} className="flex h-full flex-1 flex-col-reverse overflow-hidden rounded-sm bg-muted" title={`🟢${b.green} 🟡${b.yellow} 🔴${b.red}`}>
                  <div className="bg-signal-green" style={{ height: `${(b.green / t) * 100}%` }} />
                  <div className="bg-signal-yellow" style={{ height: `${(b.yellow / t) * 100}%` }} />
                  <div className="bg-signal-red" style={{ height: `${(b.red / t) * 100}%` }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {SIGNALS.slice()
          .reverse()
          .map((s) => {
            const names = people.filter((p) => p.understanding === s.status);
            if (names.length === 0) return null;
            return (
              <div key={s.status}>
                <p className="text-sm font-semibold">
                  {s.emoji} {s.label} ({names.length})
                </p>
                <p className="text-sm text-muted-foreground">{names.map((p) => p.nickname).join(", ")}</p>
              </div>
            );
          })}
      </div>

      <ConfirmButton
        title="신호등을 초기화할까요?"
        description="모든 수강생의 현재 표시를 지우고 다시 표시해 달라고 알려요. 지난 기록은 리포트에 남아요."
        confirmLabel="초기화"
        onConfirm={async () => {
          try {
            const res = await api<{ counts: UnderstandingCounts }>(`/api/rooms/${roomId}/understanding`, { method: "DELETE" });
            await mutate((prev) => (prev ? { ...prev, counts: res.counts } : prev), { revalidate: false });
            void mutateP();
          } catch (e) {
            toastError(e);
          }
        }}
      >
        <Button variant="outline" size="sm" disabled={room.status !== "active"}>
          <RotateCcw aria-hidden /> 새 주제 시작 (신호등 초기화)
        </Button>
      </ConfirmButton>
    </div>
  );
}
