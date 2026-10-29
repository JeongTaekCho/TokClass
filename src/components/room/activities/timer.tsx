"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

import { cn } from "@/lib/utils";

/** 시작 시각 기준 남은 시간 (초). 0 이하가 되면 0 */
export function useRemaining(startedAt: string | null, durationSec: number | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt || !durationSec) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [startedAt, durationSec]);
  if (!startedAt || !durationSec) return null;
  return Math.max(0, Math.ceil((new Date(startedAt).getTime() + durationSec * 1000 - now) / 1000));
}

export function Countdown({ remaining, total, className }: { remaining: number; total: number; className?: string }) {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const urgent = remaining <= Math.min(10, total * 0.2);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Timer className={cn("size-5", urgent ? "text-coral" : "text-primary")} aria-hidden />
      <span className={cn("font-mono text-xl font-bold tabular-nums", urgent && "text-coral")} role="timer" aria-live={remaining % 10 === 0 ? "polite" : "off"}>
        {m}:{String(s).padStart(2, "0")}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={cn("h-full rounded-full transition-all", urgent ? "bg-coral" : "bg-primary")} style={{ width: `${total ? (remaining / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}
