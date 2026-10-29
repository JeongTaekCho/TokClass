"use client";

import { setActingAs } from "@/lib/client/api";
import { RoomProvider } from "@/lib/realtime/provider";
import type { Me, PublicRoom } from "@/lib/types";

// 같은 브라우저에 수강생 쿠키가 있어도 강사 세션을 우선해요.
if (typeof window !== "undefined") setActingAs("instructor");

/** 강사 화면용 RoomProvider (진행·조 편성·참여자 화면 공용) */
export function InstructorRoomApp({ room, me, children }: { room: PublicRoom; me: Me; children: React.ReactNode }) {
  return (
    <RoomProvider initialRoom={room} me={me}>
      {children}
    </RoomProvider>
  );
}
