import { must, roomHandler } from "@/lib/api/handler";
import { badRequest } from "@/lib/api/errors";
import { db } from "@/lib/supabase/admin";
import { formatDateTimeFull } from "@/lib/format";
import { toCsv } from "@/lib/report/csv";
import type { ActivityConfig } from "@/lib/types";

function file(name: string, body: string, type: string) {
  return new Response(body, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="tokclass-export.${name.split(".").pop()}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}

/** 기록 내보내기: ?type=chat-txt | chat-csv | qa-csv | activities-csv */
export const GET = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId, actor, search }) => {
  const type = search.get("type");
  const base = actor.room.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
  const d = db();

  if (type === "chat-txt" || type === "chat-csv") {
    const rows = must(
      await d.from("messages").select("created_at, body, image_path, hidden, group:groups(name), participant:participants!messages_participant_id_fkey(nickname)").eq("room_id", roomId).order("created_at").limit(50000),
    ) as unknown as { created_at: string; body: string; image_path: string | null; hidden: boolean; group: { name: string } | null; participant: { nickname: string } | null }[];
    if (type === "chat-txt") {
      const lines = rows.map((r) => `[${formatDateTimeFull(r.created_at)}]${r.group ? ` [${r.group.name}]` : ""} ${r.participant?.nickname ?? "강사"}: ${r.body}${r.image_path ? " (이미지)" : ""}${r.hidden ? " (숨김)" : ""}`);
      return file(`${base}_채팅.txt`, `${actor.room.title} 채팅 기록\r\n\r\n${lines.join("\r\n")}\r\n`, "text/plain");
    }
    return file(
      `${base}_채팅.csv`,
      toCsv(["시각", "조", "작성자", "내용", "이미지", "숨김"], rows.map((r) => [formatDateTimeFull(r.created_at), r.group?.name ?? "", r.participant?.nickname ?? "강사", r.body, r.image_path ? "O" : "", r.hidden ? "O" : ""])),
      "text/csv",
    );
  }

  if (type === "qa-csv") {
    const rows = must(
      await d.from("questions").select("created_at, body, anonymous, vote_count, answered, answer, page, hidden, participant:participants!questions_participant_id_fkey(nickname)").eq("room_id", roomId).order("created_at").limit(10000),
    ) as unknown as { created_at: string; body: string; anonymous: boolean; vote_count: number; answered: boolean; answer: string | null; page: number | null; hidden: boolean; participant: { nickname: string } | null }[];
    const reveal = actor.settings.qaRevealAuthor;
    return file(
      `${base}_QnA.csv`,
      toCsv(
        ["시각", "작성자", "질문", "공감", "답변 완료", "답변", "교안 페이지", "숨김"],
        rows.map((r) => [formatDateTimeFull(r.created_at), r.anonymous && !reveal ? "익명" : (r.participant?.nickname ?? ""), r.body, r.vote_count, r.answered ? "O" : "", r.answer ?? "", r.page ?? "", r.hidden ? "O" : ""]),
      ),
      "text/csv",
    );
  }

  if (type === "activities-csv") {
    const acts = must(await d.from("activities").select("id, type, title, config, status").eq("room_id", roomId).neq("status", "draft").order("position")) as {
      id: string;
      type: string;
      title: string;
      config: ActivityConfig;
    }[];
    const resps = acts.length
      ? (must(await d.from("activity_responses").select("activity_id, data, score, created_at, participant:participants!activity_responses_participant_id_fkey(nickname)").in("activity_id", acts.map((a) => a.id)).order("created_at")) as unknown as {
          activity_id: string;
          data: Record<string, unknown>;
          score: number;
          created_at: string;
          participant: { nickname: string } | null;
        }[])
      : [];
    const rows: unknown[][] = [];
    for (const a of acts) {
      for (const r of resps.filter((x) => x.activity_id === a.id)) {
        let answer = "";
        if (Array.isArray(r.data.selected)) answer = (r.data.selected as number[]).map((i) => a.config.options?.[i] ?? i).join(" | ");
        else if (Array.isArray(r.data.words)) answer = (r.data.words as string[]).join(" | ");
        else if (Array.isArray(r.data.order)) answer = (r.data.order as number[]).map((i, rank) => `${rank + 1}.${a.config.items?.[i] ?? i}`).join(" ");
        else if (typeof r.data.text === "string") answer = r.data.text;
        else if ("done" in r.data) answer = r.data.done ? "완료" : "미완료";
        const correct = a.type === "quiz" ? (r.score > 0 ? "정답" : "오답") : "";
        rows.push([a.title, a.type, r.participant?.nickname ?? "", answer, correct, a.type === "quiz" ? r.score : "", formatDateTimeFull(r.created_at)]);
      }
    }
    return file(`${base}_투표_퀴즈_결과.csv`, toCsv(["활동", "종류", "참여자", "응답", "정답 여부", "점수", "시각"], rows), "text/csv");
  }

  throw badRequest("내보내기 종류를 확인해 주세요.");
});
