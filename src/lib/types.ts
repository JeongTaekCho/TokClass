import type { RoomSettings } from "@/lib/rooms/templates";

export type RoomRow = {
  id: string;
  owner_id: string;
  title: string;
  starts_at: string | null;
  capacity: number;
  template: string;
  join_code: string;
  status: "active" | "ended";
  locked: boolean;
  focus_mode: boolean;
  settings: unknown;
  current_material_id: string | null;
  current_page: number;
  readonly_token: string | null;
  created_at: string;
  updated_at: string;
};

export type ParticipantRow = {
  id: string;
  room_id: string;
  nickname: string;
  password_hmac: string;
  session_version: number;
  kicked: boolean;
  group_id: string | null;
  last_active_at: string;
  created_at: string;
};

/** 클라이언트로 내려보내는 방 정보 (민감 정보 제외) */
export type PublicRoom = {
  id: string;
  title: string;
  joinCode: string;
  status: "active" | "ended";
  locked: boolean;
  focusMode: boolean;
  capacity: number;
  startsAt: string | null;
  settings: RoomSettings;
  currentMaterialId: string | null;
  currentPage: number;
};

export type Me =
  | { kind: "instructor"; id: string; nickname: string }
  | { kind: "participant"; id: string; nickname: string; groupId: string | null };

export type ChatMessage = {
  id: string;
  roomId: string;
  groupId: string | null;
  author: { kind: "instructor" | "participant"; id: string | null; nickname: string };
  body: string;
  imageUrl: string | null;
  hidden: boolean;
  createdAt: string;
};

export type Announcement = { id: string; body: string; createdAt: string };

export type DirectMessage = { id: string; participantId: string; fromInstructor: boolean; body: string; createdAt: string; readAt: string | null };

export type Question = {
  id: string;
  body: string;
  anonymous: boolean;
  author: { id: string | null; nickname: string } | null; // 익명 + 공개 안 함이면 null
  mine: boolean;
  voted: boolean;
  voteCount: number;
  answered: boolean;
  answer: string | null;
  materialId: string | null;
  page: number | null;
  hidden: boolean;
  createdAt: string;
};

export type Material = { id: string; title: string; pageCount: number; url: string | null; sizeBytes: number; createdAt: string };
export type Resource = { id: string; kind: "file" | "link"; title: string; url: string | null; sizeBytes: number; createdAt: string };

export type UnderstandingStatus = "green" | "yellow" | "red";
export type UnderstandingCounts = { green: number; yellow: number; red: number; total: number };

export type HelpRequest = { id: string; participantId: string; nickname: string; message: string; status: "open" | "resolved"; createdAt: string };

export type ActivityType = "poll" | "wordcloud" | "quiz" | "ranking" | "open" | "ideas" | "task";
export type ActivityStatus = "draft" | "live" | "ended";

export type ActivityConfig = {
  options?: string[];
  multiple?: boolean;
  reveal?: "live" | "after";
  correct?: number[];
  timeLimitSec?: number;
  points?: number;
  leaderboard?: boolean;
  items?: string[];
  description?: string;
  durationSec?: number;
  maxWords?: number;
};

export type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  config: ActivityConfig;
  status: ActivityStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
};

export type ActivityResults =
  | { type: "poll" | "quiz"; total: number; counts: number[]; correct?: number[]; leaderboard?: { nickname: string; score: number }[] }
  | { type: "wordcloud"; total: number; words: { text: string; count: number }[] }
  | { type: "ranking"; total: number; items: { label: string; avgRank: number; score: number }[] }
  | { type: "open"; total: number; answers: { id: string; text: string; nickname: string | null }[] }
  | { type: "ideas"; total: number; ideas: { id: string; body: string; color: string; likeCount: number; liked: boolean; mine: boolean; nickname: string | null }[] }
  | { type: "task"; total: number; done: number; participants: number };

export type Submission = {
  id: string;
  kind: "image" | "file" | "link" | "text";
  title: string;
  body: string;
  url: string | null;
  fileUrl: string | null;
  fileName: string | null;
  mime: string | null;
  section: string | null;
  groupId: string | null;
  author: { kind: "instructor" | "participant"; id: string | null; nickname: string };
  mine: boolean;
  isBest: boolean;
  hidden: boolean;
  stickerCount: number;
  commentCount: number;
  stickers: Record<string, number>;
  myStickers: string[];
  createdAt: string;
};

export type SubmissionComment = { id: string; body: string; author: { kind: "instructor" | "participant"; nickname: string }; mine: boolean; createdAt: string };

export type Group = { id: string; name: string; memberCount: number };
