import type { Metadata } from "next";

import { InstructorRoomApp } from "@/components/instructor/instructor-room-app";
import { ParticipantsManager } from "@/components/instructor/participants-manager";
import { requireOwnedRoom } from "@/lib/rooms/instructor";
import { toPublicRoom } from "@/lib/rooms/public";

export const metadata: Metadata = { title: "참여자 관리" };

export default async function ParticipantsPage({ params }: PageProps<"/rooms/[id]/participants">) {
  const { id } = await params;
  const { room, user } = await requireOwnedRoom(id);
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-extrabold">참여자 관리</h1>
      <p className="mb-6 text-muted-foreground">부적절한 채팅은 진행 화면의 채팅에서 메시지별로 숨길 수 있어요.</p>
      <InstructorRoomApp room={toPublicRoom(room)} me={{ kind: "instructor", id: user.id, nickname: "강사" }}>
        <ParticipantsManager />
      </InstructorRoomApp>
    </main>
  );
}
