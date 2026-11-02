import type { Metadata } from "next";
import { Shapes } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { InstructorRoomApp } from "@/components/instructor/instructor-room-app";
import { GroupsManager } from "@/components/instructor/groups-manager";
import { requireOwnedRoom } from "@/lib/rooms/instructor";
import { toPublicRoom } from "@/lib/rooms/public";

export const metadata: Metadata = { title: "조 편성" };

export default async function GroupsPage({ params }: PageProps<"/rooms/[id]/groups">) {
  const { id } = await params;
  const { room, user } = await requireOwnedRoom(id);
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader icon={Shapes} title="조별 소그룹방" description="조를 나누면 조마다 채팅과 산출물 공간이 생겨요." />
      <InstructorRoomApp room={toPublicRoom(room)} me={{ kind: "instructor", id: user.id, nickname: "강사" }}>
        <GroupsManager />
      </InstructorRoomApp>
    </main>
  );
}
