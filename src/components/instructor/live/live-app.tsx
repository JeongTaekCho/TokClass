"use client";

import { LiveShell } from "@/components/instructor/live/live-shell";
import { setActingAs } from "@/lib/client/api";
import { RoomProvider } from "@/lib/realtime/provider";
import type { Me, PublicRoom } from "@/lib/types";

// 같은 브라우저에 수강생 쿠키가 있어도 강사 세션을 우선하도록 첫 렌더 전에 설정해요.
if (typeof window !== "undefined") setActingAs("instructor");

export function LiveApp({ room, me }: { room: PublicRoom; me: Me }) {
  return (
    <RoomProvider initialRoom={room} me={me}>
      <LiveShell />
    </RoomProvider>
  );
}
