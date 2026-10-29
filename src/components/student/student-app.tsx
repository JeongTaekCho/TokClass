"use client";

import { useEffect } from "react";

import { StudentShell } from "@/components/student/student-shell";
import { setActingAs } from "@/lib/client/api";
import { RoomProvider } from "@/lib/realtime/provider";
import type { Me, PublicRoom } from "@/lib/types";

export function StudentApp({ room, me, code }: { room: PublicRoom; me: Me; code: string }) {
  useEffect(() => setActingAs("participant"), []);
  return (
    <RoomProvider initialRoom={room} me={me}>
      <StudentShell code={code} />
    </RoomProvider>
  );
}
