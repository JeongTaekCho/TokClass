import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { JoinFlow } from "@/components/student/join-flow";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/supabase/admin";
import { loadParticipantFromSession } from "@/lib/auth/actor";
import { findRoomByCode } from "@/lib/rooms/lookup";

export const metadata: Metadata = { title: "수업 입장" };

export default async function JoinCodePage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const room = /^\d{6}$/.test(code) ? await findRoomByCode(code, { allowEnded: true }) : null;

  if (!room) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <Logo size="lg" />
        <h1 className="mt-6 text-2xl font-extrabold">수업을 찾지 못했어요</h1>
        <p className="mt-2 text-muted-foreground">참여코드 {code}에 맞는 수업이 없어요. 숫자 6자리를 다시 확인해 주세요.</p>
        <Button asChild className="mt-6">
          <Link href="/join">참여코드 다시 입력</Link>
        </Button>
      </main>
    );
  }

  // 같은 브라우저에 유효한 세션이 있으면 비밀번호 없이 이어서 입장
  if (await loadParticipantFromSession(room.id)) redirect(`/r/${code}`);

  const { count } = await db().from("participants").select("id", { count: "exact", head: true }).eq("room_id", room.id).eq("kicked", false);
  return (
    <JoinFlow
      code={code}
      room={{ id: room.id, title: room.title, status: room.status, locked: room.locked, full: (count ?? 0) >= room.capacity }}
    />
  );
}
