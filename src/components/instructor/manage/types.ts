import type { ParticipantState } from "@/lib/manage/filter";

// 타입만 가져와요 (server-only 모듈이지만 컴파일 후 사라져요).
export type { ManageParticipant, ManageRoom } from "@/lib/manage/list";
export type { ParticipantState };

export const STATE_LABEL: Record<ParticipantState, string> = { online: "접속 중", offline: "오프라인", kicked: "강퇴됨" };
