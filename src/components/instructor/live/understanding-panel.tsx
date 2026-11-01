"use client";

import useSWR from "swr";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { AnimatePresence, AnimatedNumber, PresenceItem, motion, spring } from "@/components/motion";
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
    if (data) void mutate({ ...data, counts }, { revalidate: false });
    else void mutate();
    void mutateP();
  });

  const counts = data?.counts ?? { green: 0, yellow: 0, red: 0, total: 0 };
  const responded = counts.green + counts.yellow + counts.red;
  const pct = (n: number) => (responded ? Math.round((n / responded) * 100) : 0);
  const redPct = pct(counts.red);
  const alert = responded > 0 && redPct >= room.settings.redThreshold;
  const people = (pData?.participants ?? []).filter((p) => !p.kicked);
  const trend = bucketUnderstanding(data?.events ?? [], 2 * 60_000).slice(-15);

  const tileTone = { green: "bg-mint-soft", yellow: "bg-sun-soft", red: "bg-destructive-soft" } as const;

  return (
    <div className="space-y-5">
      <section aria-labelledby="und-now" className={cn("rounded-lg border p-4 transition-colors duration-300", alert ? "border-coral/40 bg-coral-soft" : "border-border bg-surface shadow-card")}>
        <div className="flex items-baseline justify-between gap-2">
          <h3 id="und-now" className="font-bold">
            지금 이해도
          </h3>
          <span className="text-sm text-muted-foreground tabular-nums">
            <AnimatedNumber value={responded} className="font-semibold text-foreground" />/{counts.total}명 응답
          </span>
        </div>
        <AnimatePresence>
          {alert && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex items-center gap-1.5 overflow-hidden text-sm font-semibold text-destructive"
              role="alert"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden /> 막힌 수강생이 {redPct}%예요 (기준 {room.settings.redThreshold}%)
            </motion.p>
          )}
        </AnimatePresence>
        {/* 비율 바: 각 조각을 transform으로만 움직여서 값이 바뀌어도 주변이 흔들리지 않아요. */}
        <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-sunken" role="img" aria-label={SIGNALS.map((s) => `${s.label} ${counts[s.status]}명`).join(", ")}>
          {SIGNALS.map((s, i) => {
            const start = SIGNALS.slice(0, i).reduce((sum, x) => sum + pct(counts[x.status]), 0);
            return (
              <motion.div
                key={s.status}
                className={cn("absolute inset-y-0 left-0 w-full", s.color)}
                style={{ originX: 0 }}
                initial={false}
                animate={{ x: `${start}%`, scaleX: pct(counts[s.status]) / 100 }}
                transition={spring}
              />
            );
          })}
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {SIGNALS.map((s) => (
            <li key={s.status} className={cn("rounded-md px-2.5 py-2", tileTone[s.status], s.status === "red" && alert && "ring-2 ring-destructive/40")}>
              <p className="text-xs font-medium text-muted-foreground">
                <span aria-hidden>{s.emoji}</span> {s.short}
              </p>
              <p className="mt-0.5 flex items-baseline gap-1">
                <AnimatedNumber value={counts[s.status]} suffix="명" className="text-lg font-bold tabular-nums" />
                <span className="text-xs text-muted-foreground tabular-nums">{pct(counts[s.status])}%</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {trend.length > 1 && (
        <section aria-labelledby="und-trend">
          <h3 id="und-trend" className="mb-2 text-sm font-semibold text-muted-foreground">
            최근 30분 흐름
          </h3>
          <div className="flex h-20 items-end gap-1 rounded-lg bg-surface p-2 shadow-card" role="img" aria-label="최근 이해도 흐름 막대">
            {trend.map((b, i) => {
              const t = b.green + b.yellow + b.red || 1;
              return (
                <motion.div
                  key={b.at}
                  className="flex h-full flex-1 flex-col-reverse overflow-hidden rounded-[4px] bg-sunken"
                  style={{ originY: 1 }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ ...spring, delay: i * 0.02 }}
                  title={`🟢${b.green} 🟡${b.yellow} 🔴${b.red}`}
                >
                  <div className="bg-signal-green" style={{ height: `${(b.green / t) * 100}%` }} />
                  <div className="bg-signal-yellow" style={{ height: `${(b.yellow / t) * 100}%` }} />
                  <div className="bg-signal-red" style={{ height: `${(b.red / t) * 100}%` }} />
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      <div className="space-y-3">
        {SIGNALS.slice()
          .reverse()
          .map((s) => {
            const names = people.filter((p) => p.understanding === s.status);
            if (names.length === 0) return null;
            return (
              <div key={s.status}>
                <p className="text-sm font-semibold">
                  {s.emoji} {s.label} <span className="font-normal text-muted-foreground tabular-nums">{names.length}명</span>
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  <AnimatePresence initial={false}>
                    {names.map((p) => (
                      <PresenceItem key={p.id} className={cn("rounded-full px-2.5 py-1 text-sm font-medium", s.status === "red" ? s.soft : "bg-surface shadow-card")}>
                        {p.nickname}
                      </PresenceItem>
                    ))}
                  </AnimatePresence>
                </ul>
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
            if (data) await mutate({ ...data, counts: res.counts }, { revalidate: false });
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
