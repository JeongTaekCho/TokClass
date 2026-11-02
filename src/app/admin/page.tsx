import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookMarked, GraduationCap, MonitorPlay, School, ScrollText, ShieldCheck, UserCheck, UserCog, Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { IconChip } from "@/components/icon-chip";
import { AnimatedNumber, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { startOfTodayKst } from "@/lib/format";
import { db } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "개요" };

/** 숫자 카드 위쪽을 칩 색으로 물들여요. */
const WASH = { primary: "from-primary-soft/70", mint: "from-mint-soft/70", sun: "from-sun-soft/70" } as const;

/** 자주 가는 관리 화면 바로가기 */
const SHORTCUTS = [
  { href: "/admin/instructors", icon: UserCog, title: "강사 관리", body: "가입 승인·거절, 정지와 관리자 권한" },
  { href: "/admin/rooms", icon: School, title: "방 관리", body: "모든 방 검색, 강제 종료·삭제" },
  { href: "/admin/lessons", icon: BookMarked, title: "공용 교안", body: "강사가 가져다 쓰는 교안 묶음 게시" },
  { href: "/admin/audit", icon: ScrollText, title: "감사 로그", body: "관리자가 한 모든 작업 기록" },
] as const;

export default async function AdminOverviewPage() {
  await requireAdmin();
  const d = db();
  const head = { count: "exact" as const, head: true };
  const [pending, instructors, activeRooms, today] = await Promise.all([
    d.from("instructor_profiles").select("user_id", head).eq("status", "pending"),
    d.from("instructor_profiles").select("user_id", head),
    d.from("rooms").select("id", head).eq("status", "active"),
    d.from("participants").select("id", head).gte("last_active_at", startOfTodayKst()),
  ]);

  const pendingCount = pending.count ?? 0;

  return (
    <>
      <PageHeader icon={ShieldCheck} title="관리자" description="강사 승인, 방 관리, 작업 기록을 한곳에서 볼 수 있어요." />

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <Link
            href="/admin/instructors?status=pending"
            className={cn(
              "flex h-full flex-col rounded-2xl border p-5 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-raised",
              pendingCount > 0 ? "border-coral/50 bg-gradient-to-br from-coral-soft to-surface" : "border-border/60 bg-gradient-to-b from-coral-soft/60 via-surface to-surface",
            )}
          >
            <span className="flex items-center justify-between">
              <IconChip icon={UserCheck} tone="coral" />
              {pendingCount > 0 && <Badge variant="coral">처리 필요</Badge>}
            </span>
            <span className="mt-4 text-sm text-muted-foreground">승인 대기 강사</span>
            <AnimatedNumber value={pendingCount} suffix="명" className="text-[1.75rem] leading-tight font-bold tabular-nums" />
          </Link>
        </StaggerItem>
        {[
          { href: "/admin/instructors?status=approved", icon: GraduationCap, tone: "primary" as const, label: "전체 강사", value: instructors.count ?? 0, suffix: "명" },
          { href: "/admin/rooms?status=active", icon: MonitorPlay, tone: "mint" as const, label: "진행 중인 방", value: activeRooms.count ?? 0, suffix: "개" },
          { href: null, icon: Users, tone: "sun" as const, label: "오늘 참여한 수강생", value: today.count ?? 0, suffix: "명" },
        ].map((st) => {
          const body = (
            <>
              <IconChip icon={st.icon} tone={st.tone} />
              <span className="mt-4 text-sm text-muted-foreground">{st.label}</span>
              <AnimatedNumber value={st.value} suffix={st.suffix} className="text-[1.75rem] leading-tight font-bold tabular-nums" />
            </>
          );
          const cls = cn("flex h-full flex-col rounded-2xl border border-border/60 bg-gradient-to-b via-surface to-surface p-5 shadow-card", WASH[st.tone]);
          return (
            <StaggerItem key={st.label}>
              {st.href ? (
                <Link href={st.href} className={cn(cls, "transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-raised")}>
                  {body}
                </Link>
              ) : (
                <div className={cls} title="오늘 0시(한국 시간) 이후 활동">
                  {body}
                </div>
              )}
            </StaggerItem>
          );
        })}
      </Stagger>

      <section aria-labelledby="shortcut-title" className="mt-10">
        <h2 id="shortcut-title" className="mb-3 text-heading">
          바로가기
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SHORTCUTS.map((sc) => (
            <li key={sc.href}>
              <Link
                href={sc.href}
                className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-surface p-4 shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-raised"
              >
                <IconChip icon={sc.icon} tone="primary" size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{sc.title}</span>
                  <span className="block text-sm text-muted-foreground">{sc.body}</span>
                </span>
                <ArrowRight aria-hidden className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
