import type {
  Activity,
  ActivityResults,
  Announcement,
  ChatMessage,
  MessageReaction,
  PublicRoom,
  Question,
  UnderstandingCounts,
} from "@/lib/types";

/** 방 채널 `room:{roomId}` 하나에서 오가는 이벤트들 */
export type RoomEvents = {
  "room.updated": { room: PublicRoom };
  /** 전체 채팅 새 메시지 (조 채팅은 본문을 방 전체에 보내지 않고 chat.group 신호만 보내요) */
  "chat.message": { message: ChatMessage };
  /** 조 채팅 새 메시지 신호: 그 조 화면만 메시지 1건을 다시 받아 와요. */
  "chat.group": { groupId: string; id: string; author: { kind: "instructor" | "participant"; id: string | null } };
  "chat.hidden": { id: string; hidden: boolean };
  /** 조 메시지면 reactions가 null이라 그 조 화면이 다시 받아 와요. */
  "chat.reactions": { id: string; groupId: string | null; reactions: MessageReaction[] | null };
  "announce.changed": { announcements: Announcement[] };
  "dm.new": { participantId: string; fromInstructor: boolean };
  "qa.changed": { question: Question | null; id: string };
  "slide.page": { materialId: string; page: number };
  "material.changed": Record<string, never>;
  "resource.changed": Record<string, never>;
  /** nonce: 보낸 사람 화면은 누르자마자 띄웠으니, 돌아온 같은 이벤트는 건너뛰어요. */
  "reaction.float": { emoji: string; materialId: string | null; page: number | null; nonce?: string };
  "pins.changed": { materialId: string };
  "understanding.counts": { counts: UnderstandingCounts; reset?: boolean };
  /** by: 강사가 처리했는지, 수강생이 스스로 취소했는지 */
  "help.changed": { participantId: string; status: "open" | "resolved"; by: "instructor" | "self" };
  "activity.changed": { activity: Activity };
  "activity.results": { activityId: string; results: ActivityResults | null };
  "submission.changed": { id: string; groupId: string | null };
  "group.changed": Record<string, never>;
  "participant.session": { participantId: string; reason: "kicked" | "replaced" | "reissued" | "signed_out" };
  "participant.joined": { participantId: string };
};

export type RoomEventName = keyof RoomEvents;

export function roomTopic(roomId: string) {
  return `room:${roomId}`;
}
