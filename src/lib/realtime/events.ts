import type {
  Activity,
  ActivityResults,
  Announcement,
  ChatMessage,
  PublicRoom,
  Question,
  UnderstandingCounts,
} from "@/lib/types";

/** 방 채널 `room:{roomId}` 하나에서 오가는 이벤트들 */
export type RoomEvents = {
  "room.updated": { room: PublicRoom };
  "chat.message": { message: ChatMessage };
  "chat.hidden": { id: string; hidden: boolean };
  "announce.changed": { announcements: Announcement[] };
  "dm.new": { participantId: string; fromInstructor: boolean };
  "qa.changed": { question: Question | null; id: string };
  "slide.page": { materialId: string; page: number };
  "material.changed": Record<string, never>;
  "resource.changed": Record<string, never>;
  "reaction.float": { emoji: string; materialId: string | null; page: number | null };
  "pins.changed": { materialId: string };
  "understanding.counts": { counts: UnderstandingCounts };
  "help.changed": { participantId: string; status: "open" | "resolved" };
  "activity.changed": { activity: Activity };
  "activity.results": { activityId: string; results: ActivityResults | null };
  "submission.changed": { id: string; groupId: string | null };
  "group.changed": Record<string, never>;
  "participant.session": { participantId: string; reason: "kicked" | "replaced" | "reissued" };
  "participant.joined": { participantId: string };
};

export type RoomEventName = keyof RoomEvents;

export function roomTopic(roomId: string) {
  return `room:${roomId}`;
}
