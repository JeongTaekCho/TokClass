import "server-only";

import type { Actor } from "@/lib/auth/actor";
import { must } from "@/lib/api/handler";
import { db } from "@/lib/supabase/admin";
import type { Question } from "@/lib/types";

export type QuestionRow = {
  id: string;
  room_id: string;
  participant_id: string | null;
  anonymous: boolean;
  body: string;
  material_id: string | null;
  page: number | null;
  answer: string | null;
  answered: boolean;
  hidden: boolean;
  vote_count: number;
  created_at: string;
  participant?: { nickname: string } | null;
};

export const QUESTION_SELECT = "*, participant:participants!questions_participant_id_fkey(nickname)";

/**
 * 보는 사람에 맞게 질문을 변환해요.
 * - 익명 질문의 작성자는 수강생에게 절대 보내지 않아요.
 * - 강사는 방 설정(qaRevealAuthor)이 켜져 있을 때만 익명 작성자를 봐요.
 * - viewer=null 은 broadcast용 (누구에게나 보여도 되는 정보만)
 */
export function toQuestion(r: QuestionRow, viewer: Actor | null, voted = false): Question {
  const isInstructor = viewer?.kind === "instructor";
  const reveal = !r.anonymous || (isInstructor && viewer.settings.qaRevealAuthor);
  return {
    id: r.id,
    body: r.hidden && !isInstructor ? "" : r.body,
    anonymous: r.anonymous,
    author: reveal && r.participant_id ? { id: r.participant_id, nickname: r.participant?.nickname ?? "알 수 없음" } : null,
    mine: viewer?.kind === "participant" && viewer.participant.id === r.participant_id,
    voted,
    voteCount: r.vote_count,
    answered: r.answered,
    answer: r.answer,
    materialId: r.material_id,
    page: r.page,
    hidden: r.hidden,
    createdAt: r.created_at,
  };
}

export async function loadQuestion(roomId: string, id: string) {
  return must(await db().from("questions").select(QUESTION_SELECT).eq("id", id).eq("room_id", roomId).maybeSingle()) as unknown as QuestionRow | null;
}
