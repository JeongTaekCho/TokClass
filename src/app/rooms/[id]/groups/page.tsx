import type { Metadata } from "next";

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
      <h1 className="mb-6 text-2xl font-extrabold">조별 소그룹방</h1>
      <InstructorRoomApp room={toPublicRoom(room)} me={{ kind: "instructor", id: user.id, nickname: "강사" }}>
        <GroupsManager />
      </InstructorRoomApp>
    </main>
  );
}
