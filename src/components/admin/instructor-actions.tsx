"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_ACTION_LABEL, availableStatusActions, statusActionNeedsReason, type InstructorStatus, type StatusAction } from "@/lib/admin/rules";
import { api } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";

const DONE: Record<StatusAction, string> = {
  approve: "승인했어요.",
  reject: "거절했어요.",
  suspend: "정지했어요. 이 강사의 방에는 수강생이 들어올 수 없어요.",
  unsuspend: "정지를 풀었어요.",
};

/** 강사 한 명에 대한 관리자 작업 버튼 (서버가 같은 규칙으로 다시 확인해요) */
export function InstructorActions({
  userId,
  name,
  status,
  isAdmin,
  isSelf,
  emailConfirmed,
}: {
  userId: string;
  name: string;
  status: InstructorStatus;
  isAdmin: boolean;
  isSelf: boolean;
  emailConfirmed: boolean;
}) {
  const router = useRouter();
  const [reasonFor, setReasonFor] = useState<StatusAction | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function run(body: Record<string, unknown>, done: string) {
    setPending(true);
    try {
      await api(`/api/admin/instructors/${userId}`, { body });
      toast.success(`${name}님 · ${done}`);
      setReasonFor(null);
      setReason("");
      router.refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setPending(false);
    }
  }

  // 자기 계정 거절·정지는 서버에서도 막지만 버튼도 숨겨요.
  const actions = availableStatusActions(status).filter((a) => !(isSelf && (a === "reject" || a === "suspend")));

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {actions.map((a) =>
        statusActionNeedsReason(a) ? (
          <Button key={a} size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={() => setReasonFor(a)}>
            {STATUS_ACTION_LABEL[a]}
          </Button>
        ) : a === "approve" && !emailConfirmed ? (
          // 이메일 인증 → 관리자 승인 순서. 서버도 같은 규칙으로 막아요.
          <Button key={a} size="sm" variant="outline" disabled title="가입 이메일 인증을 마치면 승인할 수 있어요.">
            인증 대기
          </Button>
        ) : (
          <Button key={a} size="sm" variant={a === "approve" ? "default" : "outline"} disabled={pending} onClick={() => run({ action: a }, DONE[a])}>
            {STATUS_ACTION_LABEL[a]}
          </Button>
        ),
      )}
      {status === "approved" && !isAdmin && (
        <ConfirmButton
          title={`${name}님을 관리자로 지정할까요?`}
          description="강사 승인·정지, 모든 방의 종료·삭제를 할 수 있게 돼요."
          confirmLabel="지정"
          onConfirm={() => run({ action: "grant_admin" }, "관리자로 지정했어요.")}
        >
          <Button size="sm" variant="ghost" disabled={pending}>
            <ShieldCheck aria-hidden /> 관리자 지정
          </Button>
        </ConfirmButton>
      )}
      {isAdmin && !isSelf && (
        <ConfirmButton
          title={`${name}님의 관리자 권한을 회수할까요?`}
          description="강사 기능은 그대로 쓸 수 있어요. 마지막 관리자는 회수할 수 없어요."
          confirmLabel="회수"
          destructive
          onConfirm={() => run({ action: "revoke_admin" }, "관리자 권한을 회수했어요.")}
        >
          <Button size="sm" variant="ghost" disabled={pending}>
            <ShieldOff aria-hidden /> 권한 회수
          </Button>
        </ConfirmButton>
      )}

      <Dialog open={Boolean(reasonFor)} onOpenChange={(o) => !o && !pending && setReasonFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {name}님을 {reasonFor ? STATUS_ACTION_LABEL[reasonFor] : ""}할까요?
            </DialogTitle>
            <DialogDescription>
              {reasonFor === "suspend" ? "정지하면 이 강사는 수업을 진행할 수 없고, 방에 수강생이 들어올 수 없어요. 기록은 보존돼요." : "사유는 강사의 안내 화면에 보여요."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (reasonFor) void run({ action: reasonFor, reason }, DONE[reasonFor]);
            }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor={`reason-${userId}`}>사유</Label>
              <Textarea id={`reason-${userId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} required autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReasonFor(null)} disabled={pending}>
                취소
              </Button>
              <Button type="submit" variant="destructive" disabled={pending || !reason.trim()}>
                {pending && <Loader2 className="animate-spin" aria-hidden />}
                {reasonFor ? STATUS_ACTION_LABEL[reasonFor] : ""}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
