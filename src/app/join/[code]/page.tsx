import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NoResultsArt } from "@/components/illustrations";
import { JoinFlow } from "@/components/student/join-flow";
import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/supabase/admin";
import { loadParticipantFromSession } from "@/lib/auth/actor";
import { findRoomByCode, isRoomOwnerBlocked } from "@/lib/rooms/lookup";

export const metadata: Metadata = { title: "수업 입장" };

export default async function JoinCodePage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const room = /^\d{6}$/.test(code) ? await findRoomByCode(code, { allowEnded: true }) : null;

  if (!room) {
    return (
      <StatusScreen
        art={<NoResultsArt />}
        title="수업을 찾지 못했어요"
        actions={
          <Button asChild size="lg">
            <Link href="/join">참여코드 다시 입력</Link>
          </Button>
        }
      >
        참여코드 <span className="font-medium text-foreground tabular-nums">{code}</span>에 맞는 수업이 없어요. 숫자 6자리를 다시 확인해 주세요.
      </StatusScreen>
    );
  }

  // 정지된 강사의 방: 기록은 보존하고 입장만 막아요.
  const blocked = await isRoomOwnerBlocked(room.owner_id);
  // 같은 브라우저에 유효한 세션이 있으면 비밀번호 없이 이어서 입장
  if (!blocked && (await loadParticipantFromSession(room.id))) redirect(`/r/${code}`);

  const { count } = await db().from("participants").select("id", { count: "exact", head: true }).eq("room_id", room.id).eq("kicked", false);
  return (
    <JoinFlow
      code={code}
      room={{ id: room.id, title: room.title, status: room.status, locked: room.locked, full: (count ?? 0) >= room.capacity, blocked }}
    />
  );
}
