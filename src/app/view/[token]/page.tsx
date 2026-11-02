import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookMarked, Eye, Megaphone, MessageCircle, MessagesSquare, ThumbsUp } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { LessonBoard } from "@/components/lessons/lesson-board";
import { MessageBody } from "@/components/room/message-body";
import { AutoRefresh } from "@/components/view/auto-refresh";
import { ReadonlySlide } from "@/components/view/readonly-slide";
import { must } from "@/lib/api/handler";
import { toChatMessages, MESSAGE_SELECT, type MessageRow } from "@/lib/data/chat";
import { listAnnouncements } from "@/lib/data/announcements";
import { listRoomLessons } from "@/lib/data/lessons";
import { listMaterials } from "@/lib/data/materials";
import { SUBMISSION_SELECT, toSubmissions, type SubmissionRow } from "@/lib/data/submissions";
import { formatTime } from "@/lib/format";
import { db } from "@/lib/supabase/admin";
import { isRoomOwnerBlocked } from "@/lib/rooms/lookup";
import { normalizeSettings, type TabKey } from "@/lib/rooms/templates";
import type { RoomRow } from "@/lib/types";

export const metadata: Metadata = { title: "읽기 전용", robots: { index: false, follow: false } };

/** 읽기 전용 링크: 청강생·관계자가 수업을 열람만 해요. */
export default async function ReadonlyPage({ params }: PageProps<"/view/[token]">) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) notFound();
  const room = (await db().from("rooms").select("*").eq("readonly_token", token).maybeSingle()).data as RoomRow | null;
  if (!room || (await isRoomOwnerBlocked(room.owner_id))) notFound();

  // 강사가 꺼 둔 탭의 내용은 읽기 전용 링크에도 보여주지 않아요.
  const enabled = new Set<TabKey>(normalizeSettings(room.settings).tabs.filter((t) => t.enabled).map((t) => t.key));
  const off = Promise.resolve({ data: [], error: null });
  const d = db();
  const [announcements, materials, lessons, msgRows, qRows, sRows] = await Promise.all([
    listAnnouncements(room.id),
    enabled.has("slides") ? listMaterials(room.id) : Promise.resolve([]),
    enabled.has("lessons") ? listRoomLessons(room.id, false) : Promise.resolve([]),
    !enabled.has("chat") ? off : d.from("messages").select(MESSAGE_SELECT).eq("room_id", room.id).is("group_id", null).eq("hidden", false).order("created_at", { ascending: false }).limit(80),
    !enabled.has("qa") ? off : d.from("questions").select("id, body, anonymous, vote_count, answered, answer, participant:participants!questions_participant_id_fkey(nickname)").eq("room_id", room.id).eq("hidden", false).order("vote_count", { ascending: false }).limit(100),
    !enabled.has("board") ? off : d.from("submissions").select(SUBMISSION_SELECT).eq("room_id", room.id).eq("hidden", false).order("created_at", { ascending: false }).limit(60),
  ]);
  const messages = await toChatMessages((must(msgRows) as unknown as MessageRow[]).reverse(), "participant");
  const questions = must(qRows) as unknown as { id: string; body: string; anonymous: boolean; vote_count: number; answered: boolean; answer: string | null; participant: { nickname: string } | null }[];
  const submissions = await toSubmissions(must(sRows) as unknown as SubmissionRow[], null);
  const current = materials.find((m) => m.id === room.current_material_id) ?? materials[0];

  return (
    <div className="min-h-dvh">
      <AutoRefresh />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <LogoMark className="size-8" />
          <h1 className="min-w-0 flex-1 truncate font-semibold">{room.title}</h1>
          <span className="inline-flex items-center gap-1 rounded-sm bg-sunken px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            <Eye className="size-3.5" aria-hidden /> 읽기 전용
          </span>
        </div>
      </header>
      {announcements[0] && (
        <p className="flex items-start gap-2 border-b border-border bg-coral-soft px-4 py-2 text-sm">
          <Megaphone className="mt-0.5 size-4 shrink-0 text-coral-ink" aria-hidden />
          {announcements[0].body}
        </p>
      )}
      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {current?.url && (
            <section aria-label="슬라이드">
              <ReadonlySlide url={current.url} page={current.id === room.current_material_id ? room.current_page : 1} title={current.title} />
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {current.title} · {current.id === room.current_material_id ? room.current_page : 1} / {current.pageCount}
              </p>
            </section>
          )}
          {lessons.length > 0 && (
            <section className="border-t border-border pt-4">
              <h2 className="mb-3 flex items-center gap-1.5 font-semibold">
                <BookMarked className="size-4 text-muted-foreground" aria-hidden /> 교안
              </h2>
              <LessonBoard groups={lessons} idPrefix="view-lesson" />
            </section>
          )}
          {enabled.has("board") && <section className="border-t border-border pt-4">
            <h2 className="mb-3 font-semibold">산출물 ({submissions.length})</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {submissions.map((s) => (
                <li key={s.id} className="overflow-hidden rounded-md border border-border">
                  {s.kind === "image" && s.fileUrl ? <img src={s.fileUrl} alt={s.title || "산출물 이미지"} className="aspect-[4/3] w-full object-cover" /> : <div className="line-clamp-4 aspect-[4/3] bg-[#fffbeb] p-3 text-sm">{s.kind === "link" ? s.url : s.kind === "file" ? s.fileName : s.body}</div>}
                  <p className="truncate p-2 text-sm font-semibold">
                    {s.isBest && "🏆 "}
                    {s.title || "제목 없음"} <span className="font-normal text-muted-foreground">· {s.author.nickname}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>}
        </div>
        <div className="space-y-5">
          {enabled.has("qa") && <section className="border-t border-border pt-4">
            <h2 className="mb-3 flex items-center gap-1.5 font-semibold">
              <MessagesSquare className="size-4 text-muted-foreground" aria-hidden /> Q&A
            </h2>
            <ul className="divide-y divide-border text-sm">
              {questions.map((q) => (
                <li key={q.id} className="py-2.5">
                  <p>
                    <span className="mr-1.5 font-semibold">{q.anonymous ? "익명" : (q.participant?.nickname ?? "")}</span>
                    {q.body}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <ThumbsUp className="size-3" aria-hidden /> {q.vote_count} {q.answered && "· ✓ 답변 완료"}
                  </p>
                  {q.answer && <p className="mt-1 text-xs">A. {q.answer}</p>}
                </li>
              ))}
            </ul>
          </section>}
          {enabled.has("chat") && <section className="border-t border-border pt-4">
            <h2 className="mb-3 flex items-center gap-1.5 font-semibold">
              <MessageCircle className="size-4 text-muted-foreground" aria-hidden /> 채팅
            </h2>
            <ul className="max-h-[480px] space-y-2 overflow-y-auto text-sm">
              {messages.map((m) => (
                <li key={m.id}>
                  <span className={m.author.kind === "instructor" ? "font-semibold text-coral-ink" : "font-semibold"}>{m.author.nickname}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">{formatTime(m.createdAt)}</span>
                  {m.imageUrl && <img src={m.imageUrl} alt="채팅 이미지" className="my-1 max-h-40 rounded-md" />}
                  <MessageBody text={m.body} className="text-sm" />
                </li>
              ))}
            </ul>
          </section>}
        </div>
      </main>
    </div>
  );
}
