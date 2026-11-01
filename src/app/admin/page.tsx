import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, MonitorPlay, UserCheck, Users } from "lucide-react";

import { IconChip } from "@/components/icon-chip";
import { AnimatedNumber, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { startOfTodayKst } from "@/lib/format";
import { db } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "개요" };

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
      <h1 className="mb-1 text-title">관리자</h1>
      <p className="mb-8 text-muted-foreground">강사 승인, 방 관리, 작업 기록을 한곳에서 볼 수 있어요.</p>

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <Link
            href="/admin/instructors?status=pending"
            className={cn(
              "flex h-full flex-col rounded-lg border p-5 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-raised",
              pendingCount > 0 ? "border-coral/50 bg-coral-soft" : "border-border/70 bg-surface",
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
          const cls = "flex h-full flex-col rounded-lg border border-border/70 bg-surface p-5 shadow-card";
          return (
            <StaggerItem key={st.label}>
              {st.href ? (
                <Link href={st.href} className={cn(cls, "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-raised")}>
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
    </>
  );
}
