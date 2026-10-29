import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, FileText, MessageCircleQuestion, NotebookPen, Trophy } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { MessageBody } from "@/components/room/message-body";
import { Button } from "@/components/ui/button";
import { must } from "@/lib/api/handler";
import { listMaterials } from "@/lib/data/materials";
import { listResources } from "@/lib/data/resources";
import { SUBMISSION_SELECT, toSubmissions, type SubmissionRow } from "@/lib/data/submissions";
import { formatDate } from "@/lib/format";
import { normalizeSettings } from "@/lib/rooms/templates";
import { requireParticipant } from "@/lib/rooms/student";
import { db } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "복습", robots: { index: false } };

function Section({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <Icon className="size-5 text-primary" aria-hidden /> {title}
      </h2>
      {children}
    </section>
  );
}

/** 수강생 복습 페이지: 교안, 내 메모, 내 산출물, 답변 달린 Q&A */
export default async function ReviewPage({ params }: PageProps<"/r/[code]/review">) {
  const { code } = await params;
  const { room, participant } = await requireParticipant(code);
  const d = db();
  const [materials, resources, notesRes, subRows, qaRes] = await Promise.all([
    listMaterials(room.id),
    listResources(room.id),
    d.from("notes").select("material_id, page, body").eq("participant_id", participant.id).order("page"),
    d.from("submissions").select(SUBMISSION_SELECT).eq("room_id", room.id).eq("participant_id", participant.id).order("created_at", { ascending: false }),
    d.from("questions").select("id, body, answer, page, vote_count, participant_id").eq("room_id", room.id).eq("hidden", false).eq("answered", true).order("vote_count", { ascending: false }).limit(200),
  ]);
  const notes = must(notesRes) as { material_id: string; page: number; body: string }[];
  const settings = normalizeSettings(room.settings);
  const submissions = await toSubmissions(must(subRows) as unknown as SubmissionRow[], { kind: "participant", participant, room, settings });
  const answered = must(qaRes) as { id: string; body: string; answer: string | null; page: number | null; vote_count: number; participant_id: string | null }[];
  const matTitle = new Map(materials.map((m) => [m.id, m.title]));

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-4">
          <LogoMark className="size-8" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{room.title}</p>
            <p className="text-xs text-muted-foreground">{participant.nickname}님의 복습 노트</p>
          </div>
          {room.status === "active" && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/r/${code}`}>
                <ArrowLeft aria-hidden /> 수업으로
              </Link>
            </Button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6">
        <h1 className="text-2xl font-extrabold">복습</h1>

        <Section icon={FileText} title="교안·자료">
          {materials.length === 0 && resources.length === 0 && <p className="text-sm text-muted-foreground">올라온 자료가 없어요.</p>}
          <ul className="space-y-2">
            {materials.map((m) => (
              <li key={m.id}>
                <a href={m.url ?? "#"} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-3 rounded-xl border border-border p-3 hover:border-primary/40">
                  <Download className="size-5 text-primary" aria-hidden />
                  <span className="flex-1 font-semibold">{m.title}.pdf</span>
                  <span className="text-xs text-muted-foreground">{m.pageCount}쪽</span>
                </a>
              </li>
            ))}
            {resources.map((r) => (
              <li key={r.id}>
                <a href={r.url ?? "#"} target="_blank" rel="noopener noreferrer nofollow" className="flex min-h-12 items-center gap-3 rounded-xl border border-border p-3 hover:border-primary/40">
                  {r.kind === "link" ? <ExternalLink className="size-5 text-primary" aria-hidden /> : <Download className="size-5 text-primary" aria-hidden />}
                  <span className="flex-1 font-semibold">{r.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={NotebookPen} title={`내 메모 (${notes.length})`}>
          {notes.length === 0 && <p className="text-sm text-muted-foreground">교안 화면의 [메모]로 페이지마다 메모를 남길 수 있어요.</p>}
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={`${n.material_id}-${n.page}`} className="rounded-xl bg-[#fffbeb] p-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  {matTitle.get(n.material_id) ?? "교안"} · {n.page}페이지
                </p>
                <p className="whitespace-pre-wrap">{n.body}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={Trophy} title={`내 산출물 (${submissions.length})`}>
          {submissions.length === 0 && <p className="text-sm text-muted-foreground">올린 산출물이 없어요.</p>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {submissions.map((s) => (
              <li key={s.id} className="rounded-xl border border-border p-3">
                <p className="font-semibold">
                  {s.isBest && "🏆 "}
                  {s.title || "제목 없음"} <span className="text-xs font-normal text-muted-foreground">· {formatDate(s.createdAt)}</span>
                </p>
                {s.kind === "image" && s.fileUrl && <img src={s.fileUrl} alt={s.title || "내 이미지"} className="mt-2 max-h-56 w-full rounded-lg object-contain" />}
                {s.kind === "file" && s.fileUrl && (
                  <a href={s.fileUrl} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline">
                    <Download className="size-4" aria-hidden /> {s.fileName}
                  </a>
                )}
                {s.kind === "link" && s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 block text-sm break-all text-primary underline">
                    {s.url}
                  </a>
                )}
                {s.body && <MessageBody text={s.body} className="mt-2 line-clamp-6 text-sm" />}
                <p className="mt-2 text-xs text-muted-foreground">
                  스티커 {s.stickerCount} · 댓글 {s.commentCount}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={MessageCircleQuestion} title={`답변 달린 Q&A (${answered.length})`}>
          {answered.length === 0 && <p className="text-sm text-muted-foreground">답변 완료된 질문이 없어요.</p>}
          <ul className="space-y-3">
            {answered.map((q) => (
              <li key={q.id} className="rounded-xl border border-border p-3">
                <p className="font-medium">
                  Q. {q.body}
                  {q.participant_id === participant.id && <span className="ml-1.5 rounded-full bg-primary-soft px-2 text-xs text-primary-hover">내 질문</span>}
                  {q.page && <span className="ml-1.5 text-xs text-muted-foreground">p.{q.page}</span>}
                </p>
                <p className="mt-1.5 text-sm whitespace-pre-wrap text-muted-foreground">{q.answer ? `A. ${q.answer}` : "수업 중에 말로 답변했어요."}</p>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  );
}
