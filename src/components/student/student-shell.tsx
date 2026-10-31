"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { BookOpen, Eye, KeyRound, LogOut, MessageSquareText, UserRound, X } from "lucide-react";

import { ClassroomShell, useMe } from "@/components/room/classroom-shell";
import { DmThread } from "@/components/room/dm-thread";
import { ActivityPopup } from "@/components/student/activity-popup";
import { BottomBar } from "@/components/student/bottom-bar";
import { SessionLost } from "@/components/student/session-lost";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api, fetcher } from "@/lib/client/api";
import { copyText } from "@/lib/client/clipboard";
import { forgetPassword, readPassword } from "@/lib/client/password-store";
import { toastError } from "@/lib/client/toast-error";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { DirectMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** 수강생 수업 화면: 강사와 같은 수업 화면(ClassroomShell) + 수강생 전용 1:1·프로필·하단 바·활동 팝업 */
export function StudentShell({ code }: { code: string }) {
  const { roomId, sessionLost } = useRoom();
  const me = useMe();
  // 1:1 대화창: 넓은 화면은 수업 화면 옆에 열어 둔 채로 수업을 들을 수 있고, 좁은 화면은 전체 화면으로 열려요.
  const [dmOpen, setDmOpen] = useState(false);

  // 1:1 메시지 안 읽은 수
  const dmKey = `/api/rooms/${roomId}/dms`;
  const { data: dmData, mutate: mutateDm } = useSWR<{ messages: DirectMessage[]; unread: number }>(dmKey, fetcher, { revalidateOnFocus: false });
  useRoomEvent("dm.new", (p) => {
    if (p.participantId === me.id && p.fromInstructor) {
      void mutateDm();
      if (!dmOpen) toast("강사님이 1:1 메시지를 보냈어요", { action: { label: "보기", onClick: () => setDmOpen(true) } });
    }
  });
  const dmUnread = dmOpen ? 0 : (dmData?.unread ?? 0);

  return (
    <ClassroomShell
      heightClass="h-dvh"
      headerActions={
        <>
          <Button
            variant={dmOpen ? "soft" : "outline"}
            size="sm"
            aria-expanded={dmOpen}
            aria-label={`강사님과 1:1 대화${dmUnread ? `, 안 읽은 메시지 ${dmUnread}개` : ""}`}
            onClick={() => setDmOpen((v) => !v)}
          >
            <MessageSquareText aria-hidden />
            <span>1:1 대화</span>
            {dmUnread > 0 && <span className="rounded-full bg-coral px-1.5 text-[11px] leading-5 font-bold text-white">{dmUnread}</span>}
          </Button>
          <ProfileMenu code={code} />
        </>
      }
      endedNotice={
        <>
          수업이 끝났어요.{" "}
          <Link href={`/r/${code}/review`} className="font-semibold text-primary underline">
            복습 페이지
          </Link>
          에서 기록을 다시 볼 수 있어요.
        </>
      }
      tools={
        dmOpen && (
          <aside
            aria-label="강사님과 1:1 대화"
            className={cn(
              "flex min-h-0 flex-col bg-card",
              // 좁은 화면: 전체 화면 / 넓은 화면: 수업 화면 옆에 고정
              "fixed inset-0 z-50 lg:static lg:z-auto lg:w-[360px] lg:shrink-0 lg:border-l lg:border-border",
            )}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <MessageSquareText className="size-4 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-bold">강사님과 1:1 대화</p>
                <p className="text-xs text-muted-foreground">나와 강사님만 볼 수 있어요. 창을 닫아도 대화는 남아 있어요.</p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="1:1 대화 닫기" onClick={() => setDmOpen(false)}>
                <X aria-hidden />
              </Button>
            </div>
            <DmThread onRead={() => void mutateDm()} />
          </aside>
        )
      }
      footer={<BottomBar />}
      overlay={
        <>
          <ActivityPopup />
          {sessionLost && <SessionLost reason={sessionLost} code={code} />}
        </>
      }
    />
  );
}

function ProfileMenu({ code }: { code: string }) {
  const { roomId, me } = useRoom();
  const router = useRouter();
  const [pwOpen, setPwOpen] = useState(false);
  const [password, setPassword] = useState<string | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="내 프로필">
            <UserRound aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-sm text-foreground">{me.nickname}님</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setPassword(readPassword(roomId));
              setPwOpen(true);
            }}
          >
            <KeyRound aria-hidden /> 비밀번호 다시 보기
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/r/${code}/review`}>
              <BookOpen aria-hidden /> 복습 페이지
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={async () => {
              if (!confirm("이 기기에서 나갈까요? 비밀번호로 다시 들어올 수 있어요.")) return;
              try {
                await api(`/api/rooms/${roomId}/leave`, { method: "POST" });
                forgetPassword(roomId);
                router.replace(`/join/${code}`);
                router.refresh();
              } catch (e) {
                toastError(e);
              }
            }}
          >
            <LogOut aria-hidden /> 이 기기에서 나가기
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>내 임시 비밀번호</DialogTitle>
            <DialogDescription>다른 기기나 다음 수업에서 이 비밀번호로 다시 들어올 수 있어요.</DialogDescription>
          </DialogHeader>
          {password ? (
            <div className="rounded-2xl bg-primary-soft p-5 text-center">
              <p className="font-mono text-3xl font-extrabold tracking-[0.3em] text-primary-hover">{password}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => copyText(password, "비밀번호를 복사했어요.")}>
                복사
              </Button>
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm">
              <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
              보안을 위해 비밀번호는 처음 받은 기기의 이 브라우저 탭에서만 다시 볼 수 있어요. 잊어버렸다면 강사님께 재발급을 요청해 주세요.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
