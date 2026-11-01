import "server-only";

import { after } from "next/server";

import { must } from "@/lib/api/handler";
import { broadcast } from "@/lib/realtime/server";
import { toPublicRoom } from "@/lib/rooms/public";
import { removeRoomFiles } from "@/lib/storage/server";
import { db } from "@/lib/supabase/admin";
import type { RoomRow } from "@/lib/types";

/**
 * 방 삭제 (강사·관리자 공통)
 * 1) 접속 중인 화면에 수업 종료를 알려요 (삭제 뒤에는 채널 권한이 없어져 못 보내요).
 * 2) DB에서 지워요. 하위 테이블은 on delete cascade로 함께 지워져요.
 * 3) 파일은 응답 뒤에 지워요. 실패해도 DB는 이미 지워졌고, 남는 건 고아 파일뿐이에요.
 */
export async function deleteRoom(room: RoomRow) {
  await broadcast(room.id, "room.updated", { room: toPublicRoom({ ...room, status: "ended" }) });
  must(await db().from("rooms").delete().eq("id", room.id));
  after(async () => {
    try {
      await removeRoomFiles(room.id);
    } catch (e) {
      console.error("[rooms] 삭제한 방의 파일 정리 실패", room.id, e);
    }
  });
}
