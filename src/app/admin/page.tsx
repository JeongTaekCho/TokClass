import type { Metadata } from "next";
import Link from "next/link";
import { Clock, DoorOpen, UserCheck, Users } from "lucide-react";

import { startOfTodayKst } from "@/lib/format";
import { db } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

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

  const stats = [
    { label: "승인 대기", value: pending.count ?? 0, icon: Clock, href: "/admin/instructors?status=pending", highlight: (pending.count ?? 0) > 0 },
    { label: "전체 강사", value: instructors.count ?? 0, icon: UserCheck, href: "/admin/instructors?status=approved" },
    { label: "진행 중인 방", value: activeRooms.count ?? 0, icon: DoorOpen, href: "/admin/rooms?status=active" },
    { label: "오늘 참여한 수강생", value: today.count ?? 0, icon: Users, hint: "오늘 0시(한국 시간) 이후 활동" },
  ];

  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold">관리자</h1>
      <p className="mb-6 text-muted-foreground">강사 승인, 방 관리, 작업 기록을 한곳에서 볼 수 있어요.</p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <>
              <s.icon className="size-5 text-primary" aria-hidden />
              <p className="mt-3 text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-extrabold">
                {s.value.toLocaleString("ko-KR")}
                {s.highlight && <span className="rounded-full bg-coral px-2 py-0.5 text-xs font-bold text-white">처리 필요</span>}
              </p>
              {s.hint && <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>}
            </>
          );
          return (
            <li key={s.label}>
              {s.href ? (
                <Link href={s.href} className="block rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:border-primary/40">
                  {body}
                </Link>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
