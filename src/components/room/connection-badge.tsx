"use client";

import { useRoom } from "@/lib/realtime/provider";
import { cn } from "@/lib/utils";

export function ConnectionBadge({ className }: { className?: string }) {
  const { status } = useRoom();
  const label = status === "connected" ? "실시간 연결됨" : status === "connecting" ? "연결 중" : "다시 연결하는 중";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)} role="status" aria-live="polite">
      <span
        className={cn(
          "size-2 rounded-full",
          status === "connected" ? "bg-signal-green" : status === "connecting" ? "bg-signal-yellow" : "animate-pulse bg-coral",
        )}
        aria-hidden
      />
      <span className={cn(status === "connected" && "sr-only sm:not-sr-only")}>{label}</span>
    </span>
  );
}
