"use client";

import { InstructorRoomApp } from "@/components/instructor/instructor-room-app";
import { LiveShell } from "@/components/instructor/live/live-shell";
import type { Me, PublicRoom } from "@/lib/types";

export function LiveApp({ room, me }: { room: PublicRoom; me: Me }) {
  return (
    <InstructorRoomApp room={room} me={me}>
      <LiveShell />
    </InstructorRoomApp>
  );
}
