import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, DoorOpen, Settings, Users } from "lucide-react";

import { InstructorHeader } from "@/components/instructor/instructor-header";
import { NewRoomDialog } from "@/components/instructor/new-room-dialog";
import { TemplateList } from "@/components/instructor/template-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";
import { TEMPLATE_INFO, type BuiltinTemplate } from "@/lib/rooms/templates";
import { db } from "@/lib/supabase/admin";
import { instructorDisplayName, requireApprovedInstructor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "내 방" };

type RoomListRow = {
  id: string;
  title: string;
  join_code: string;
  status: "active" | "ended";
  template: string;
  starts_at: string | null;
  created_at: string;
  capacity: number;
  participants: { count: number }[];
};

export default async function DashboardPage() {
  const access = await requireApprovedInstructor("/dashboard");
  const { user } = access;

  const [{ data: rooms, error }, { data: templates }] = await Promise.all([
    db()
      .from("rooms")
      .select("id, title, join_code, status, template, starts_at, created_at, capacity, participants!participants_room_id_fkey(count)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .returns<RoomListRow[]>(),
    db().from("room_templates").select("id, name, created_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (error) console.error("[dashboard] 방 목록 조회 실패", error);

  return (
    <div className="min-h-dvh">
      <InstructorHeader name={instructorDisplayName(access)} isAdmin={access.profile.isAdmin} />
      <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_300px]">
        <section aria-labelledby="rooms-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 id="rooms-title" className="text-2xl font-extrabold">
                내 방
              </h1>
              <p className="text-muted-foreground">방을 열고 참여코드를 공유하면 수업 준비 끝이에요.</p>
            </div>
            <NewRoomDialog templates={templates ?? []} />
          </div>

          {!rooms || rooms.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-primary/30 bg-card p-10 text-center">
              <DoorOpen className="mx-auto size-10 text-primary" aria-hidden />
              <p className="mt-3 text-lg font-bold">아직 만든 방이 없어요</p>
              <p className="text-muted-foreground">[새 방 만들기]로 첫 수업을 준비해 보세요.</p>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {rooms.map((r) => {
                const count = r.participants?.[0]?.count ?? 0;
                const tplName = TEMPLATE_INFO[r.template as BuiltinTemplate]?.name ?? "내 템플릿";
                return (
                  <li key={r.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 text-lg font-bold">{r.title}</h2>
                      {r.status === "active" ? <Badge variant="soft">진행 중</Badge> : <Badge variant="secondary">종료</Badge>}
                    </div>
                    <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <dt className="sr-only">참여코드</dt>
                        <dd className="font-mono text-base font-bold tracking-widest text-foreground">{r.join_code}</dd>
                        <span aria-hidden>·</span>
                        <dd>{tplName}</dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="size-4" aria-hidden />
                        <dt className="sr-only">참여자</dt>
                        <dd>
                          참여자 {count}명 / 정원 {r.capacity}명
                        </dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="size-4" aria-hidden />
                        <dt className="sr-only">일시</dt>
                        <dd>{r.starts_at ? formatDateTime(r.starts_at) : `${formatDate(r.created_at)} 생성`}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex gap-2">
                      <Button asChild className="flex-1">
                        <Link href={`/rooms/${r.id}/live`}>{r.status === "active" ? "수업 진행" : "기록 보기"}</Link>
                      </Button>
                      <Button asChild variant="outline" size="icon" aria-label={`${r.title} 설정`}>
                        <Link href={`/rooms/${r.id}/settings`}>
                          <Settings aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside aria-labelledby="tpl-title" className="space-y-3">
          <h2 id="tpl-title" className="text-lg font-bold">
            템플릿
          </h2>
          <p className="text-sm text-muted-foreground">방 설정에서 [템플릿으로 저장]을 누르면 여기에 추가돼요.</p>
          <TemplateList templates={templates ?? []} />
        </aside>
      </main>
    </div>
  );
}
