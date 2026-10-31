"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";

/** 관리자: 방 강제 종료 / 삭제 (삭제는 방 제목을 입력해야 해요) */
export function RoomActions({ roomId, title, status }: { roomId: string; title: string; status: "active" | "ended" }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [pending, setPending] = useState(false);

  async function end() {
    try {
      await api(`/api/admin/rooms/${roomId}`, { body: { action: "end" } });
      toast.success(`"${title}" 방을 종료했어요.`);
      router.refresh();
    } catch (e) {
      toastError(e);
    }
  }

  async function remove() {
    setPending(true);
    try {
      await api(`/api/admin/rooms/${roomId}`, { method: "DELETE", body: { confirmTitle } });
      toast.success(`"${title}" 방을 삭제했어요.`);
      setDeleting(false);
      router.refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setPending(false);
    }
  }

  const matches = confirmTitle.trim() === title.trim();

  return (
    <div className="flex justify-end gap-1">
      {status === "active" && (
        <ConfirmButton
          title={`"${title}" 방을 강제로 종료할까요?`}
          description="수강생 화면에 바로 종료가 반영돼요. 기록은 남고, 강사가 다시 열 수 있어요."
          confirmLabel="종료"
          destructive
          onConfirm={end}
        >
          <Button size="sm" variant="ghost">
            <Power aria-hidden /> 강제 종료
          </Button>
        </ConfirmButton>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive"
        onClick={() => {
          setConfirmTitle("");
          setDeleting(true);
        }}
      >
        <Trash2 aria-hidden /> 삭제
      </Button>

      <Dialog open={deleting} onOpenChange={(o) => !pending && setDeleting(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>방을 삭제할까요?</DialogTitle>
            <DialogDescription>채팅·산출물·교안 파일까지 모두 지워지고 되돌릴 수 없어요. 확인을 위해 방 제목을 그대로 입력해 주세요.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (matches) void remove();
            }}
          >
            <p className="rounded-xl bg-muted px-3 py-2 text-sm font-semibold break-all">{title}</p>
            <div className="space-y-2">
              <Label htmlFor={`confirm-${roomId}`}>방 제목</Label>
              <Input id={`confirm-${roomId}`} value={confirmTitle} onChange={(e) => setConfirmTitle(e.target.value)} autoComplete="off" autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleting(false)} disabled={pending}>
                취소
              </Button>
              <Button type="submit" variant="destructive" disabled={!matches || pending}>
                {pending && <Loader2 className="animate-spin" aria-hidden />}
                삭제
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
