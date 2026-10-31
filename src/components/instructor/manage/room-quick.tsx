"use client";

import { Copy, Lock, LockOpen, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/client/api";
import { copyText } from "@/lib/client/clipboard";
import { toastError } from "@/lib/client/toast-error";

import type { ManageRoom } from "./types";

/** 방 단위 빠른 작업: 참여코드, 정원, 입장 마감 */
export function RoomQuick({ room, onChanged }: { room: ManageRoom; onChanged: () => void }) {
  async function toggleLock(locked: boolean) {
    try {
      await api(`/api/rooms/${room.id}`, { method: "PATCH", body: { locked } });
      toast.success(locked ? "입장을 마감했어요. 기존 수강생은 비밀번호로 다시 들어올 수 있어요." : "입장을 다시 열었어요.");
      onChanged();
    } catch (e) {
      toastError(e);
    }
  }

  const full = room.participantCount >= room.capacity;
  return (
    <section aria-label={`${room.title} 빠른 작업`} className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate font-bold">
          {room.title}
          {room.status === "active" ? <Badge variant="soft">진행 중</Badge> : <Badge variant="secondary">종료</Badge>}
        </p>
        <button
          type="button"
          className="mt-0.5 inline-flex items-center gap-1 font-mono text-lg font-bold tracking-widest hover:text-primary"
          onClick={() => copyText(room.joinCode, "참여코드를 복사했어요.")}
          aria-label={`참여코드 ${room.joinCode} 복사`}
        >
          {room.joinCode} <Copy className="size-4" aria-hidden />
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-sm">
        <Users className="size-4 text-muted-foreground" aria-hidden />
        정원 <strong className={full ? "text-coral" : undefined}>{room.participantCount}</strong> / {room.capacity}명{full && <span className="text-coral">(가득 참)</span>}
      </p>
      {room.status === "active" && (
        <label className="ml-auto flex items-center gap-2 text-sm font-semibold">
          {room.locked ? <Lock className="size-4 text-coral" aria-hidden /> : <LockOpen className="size-4 text-muted-foreground" aria-hidden />}
          입장 마감
          <Switch checked={room.locked} onCheckedChange={(v) => void toggleLock(v)} aria-label="입장 마감" />
        </label>
      )}
    </section>
  );
}
