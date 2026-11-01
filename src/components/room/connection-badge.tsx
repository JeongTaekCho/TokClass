"use client";

import { useRoom } from "@/lib/realtime/provider";
import { cn } from "@/lib/utils";

/** 실시간 연결 상태. 연결되면 초록 점이 은은하게 숨 쉬어요(라이브 표시). */
export function ConnectionBadge({ className }: { className?: string }) {
  const { status } = useRoom();
  const label = status === "connected" ? "실시간 연결됨" : status === "connecting" ? "연결 중" : "다시 연결하는 중";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)} role="status" aria-live="polite">
      <span className="relative inline-flex size-2" aria-hidden>
        {status === "connected" && <span className="absolute inset-0 animate-live rounded-full bg-signal-green motion-reduce:hidden" />}
        <span className={cn("relative size-2 rounded-full", status === "connected" ? "bg-signal-green" : status === "connecting" ? "bg-signal-yellow" : "bg-coral")} />
      </span>
      <span className={cn(status === "connected" && "sr-only sm:not-sr-only")}>{label}</span>
    </span>
  );
}
