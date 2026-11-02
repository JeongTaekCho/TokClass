import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MonitorPlay, Settings, Users, Archive, LayoutTemplate } from "lucide-react";

import { IconChip } from "@/components/icon-chip";
import { EmptyRoomsArt, TeacherDeskArt } from "@/components/illustrations";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { NewRoomDialog } from "@/components/instructor/new-room-dialog";
import { TemplateList } from "@/components/instructor/template-list";
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

  const list = rooms ?? [];
  // 진행 중인 방을 먼저, 끝난 방은 아래에 모아 보여줘요.
  const groups = [
    { key: "active", title: "진행 중", rooms: list.filter((r) => r.status === "active") },
    { key: "ended", title: "지난 수업", rooms: list.filter((r) => r.status === "ended") },
  ].filter((g) => g.rooms.length > 0);

  const name = instructorDisplayName(access);
  const activeCount = list.filter((r) => r.status === "active").length;
  const totalStudents = list.reduce((n, r) => n + (r.participants?.[0]?.count ?? 0), 0);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {/* 인사 배너: 오늘의 요약 + 새 방 만들기 */}
        <FadeIn className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-primary-soft via-surface to-coral-soft shadow-glow">
          <div aria-hidden className="blob -top-20 -left-16 size-72 bg-primary/20" />
          <div aria-hidden className="blob -right-10 -bottom-24 size-72 bg-coral/20" />
          <div aria-hidden className="absolute inset-0 bg-dots opacity-60 [mask-image:radial-gradient(ellipse_at_80%_50%,black,transparent_65%)]" />
          <div className="relative grid items-center gap-4 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_240px]">
            <div>
              <p className="text-sm font-semibold text-primary">{name ? `${name}님, 반가워요 👋` : "반가워요 👋"}</p>
              <h1 id="rooms-title" className="mt-1 text-title sm:text-[1.75rem]">
                오늘은 어떤 수업을 열까요?
              </h1>
              <p className="mt-1 text-muted-foreground">방을 열고 참여코드를 공유하면 수업 준비 끝이에요.</p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <NewRoomDialog templates={templates ?? []} />
                <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface/80 px-3 text-sm shadow-card">
                  <MonitorPlay aria-hidden className="size-4 text-success" /> 진행 중 <strong className="tabular-nums">{activeCount}</strong>개
                </span>
                <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface/80 px-3 text-sm shadow-card">
                  <Users aria-hidden className="size-4 text-primary" /> 누적 수강생 <strong className="tabular-nums">{totalStudents.toLocaleString("ko-KR")}</strong>명
                </span>
              </div>
            </div>
            <TeacherDeskArt className="mx-auto hidden max-w-60 md:block" />
          </div>
        </FadeIn>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section aria-labelledby="rooms-title">
            {list.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/25 bg-surface/80 py-12 shadow-card">
                <FadeIn className="flex flex-col items-center px-4 text-center">
                  <EmptyRoomsArt className="max-w-64" />
                  <p className="mt-4 text-heading">아직 만든 방이 없어요</p>
                  <p className="text-muted-foreground">[새 방 만들기]로 첫 수업을 준비해 보세요.</p>
                </FadeIn>
              </div>
            ) : (
              <div className="space-y-10">
                {groups.map((g) => (
                  <section key={g.key} aria-labelledby={`rooms-${g.key}`}>
                    <h2 id={`rooms-${g.key}`} className="mb-3 flex items-center gap-2 text-heading">
                      {g.key === "active" ? (
                        <span className="relative inline-flex size-2.5" aria-hidden>
                          <span className="absolute inset-0 animate-live rounded-full bg-signal-green motion-reduce:hidden" />
                          <span className="relative size-2.5 rounded-full bg-signal-green" />
                        </span>
                      ) : (
                        <Archive aria-hidden className="size-4 text-muted-foreground" />
                      )}
                      {g.title} <span className="text-base font-medium text-muted-foreground tabular-nums">{g.rooms.length}</span>
                    </h2>
                    <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {g.rooms.map((r) => (
                        <RoomCard key={r.id} r={r} />
                      ))}
                    </Stagger>
                  </section>
                ))}
              </div>
            )}
          </section>

          <aside aria-labelledby="tpl-title" className="h-fit space-y-3 rounded-2xl border border-border/60 bg-gradient-to-b from-lilac-soft/70 via-surface to-surface p-5 shadow-card">
            <div className="flex items-center gap-3">
              <IconChip icon={LayoutTemplate} tone="lilac" />
              <h2 id="tpl-title" className="text-heading">
                내 템플릿
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">방 설정에서 [템플릿으로 저장]을 누르면 여기에 추가돼요.</p>
            <TemplateList templates={templates ?? []} />
          </aside>
        </div>
    </main>
  );
}

/** 방 카드: 상태·제목·일시 / 참여코드·인원 / 행동. 올리면 살짝 떠올라요. */
function RoomCard({ r }: { r: RoomListRow }) {
  const count = r.participants?.[0]?.count ?? 0;
  const tplName = TEMPLATE_INFO[r.template as BuiltinTemplate]?.name ?? "내 템플릿";
  const active = r.status === "active";
  const fill = Math.min(100, Math.round((count / Math.max(1, r.capacity)) * 100));
  return (
    <StaggerItem className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface p-5 shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-raised">
      {/* 진행 중인 방은 위쪽에 브랜드 색 띠 */}
      <span aria-hidden className={active ? "bg-brand absolute inset-x-0 top-0 h-1" : "absolute inset-x-0 top-0 h-1 bg-border"} />
      <div className="flex items-start justify-between gap-2">
        <IconChip icon={MonitorPlay} tone={active ? "primary" : "muted"} />
        {active ? <Badge variant="success">진행 중</Badge> : <Badge variant="secondary">종료</Badge>}
      </div>
      <h3 className="mt-4 truncate text-heading" title={r.title}>
        {r.title}
      </h3>
      <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
        <CalendarDays aria-hidden className="size-3.5 shrink-0" />
        {tplName} · {r.starts_at ? formatDateTime(r.starts_at) : `${formatDate(r.created_at)} 생성`}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md border border-dashed border-primary/30 bg-primary-soft/50 px-3 py-2">
          <dt className="text-xs text-muted-foreground">참여코드</dt>
          <dd className="font-mono text-base font-bold tracking-wider text-primary-ink tabular-nums">{r.join_code}</dd>
        </div>
        <div className="rounded-md bg-sunken px-3 py-2">
          <dt className="text-xs text-muted-foreground">참여자 / 정원</dt>
          <dd className="tabular-nums">
            <span className="text-base font-bold">{count}</span> <span className="text-muted-foreground">/ {r.capacity}명</span>
          </dd>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border" aria-hidden>
            <div className="bg-brand h-full origin-left rounded-full" style={{ transform: `scaleX(${fill / 100})` }} />
          </div>
        </div>
      </dl>
      <div className="mt-4 flex gap-2">
        <Button asChild variant={active ? "default" : "outline"} size="sm" className="flex-1">
          <Link href={`/rooms/${r.id}/live`}>{active ? "수업 진행" : "기록 보기"}</Link>
        </Button>
        <Button asChild variant="outline" size="icon-sm" aria-label={`${r.title} 설정`}>
          <Link href={`/rooms/${r.id}/settings`}>
            <Settings aria-hidden />
          </Link>
        </Button>
      </div>
    </StaggerItem>
  );
}
