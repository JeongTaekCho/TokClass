import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { InstructorActions } from "@/components/admin/instructor-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL } from "@/lib/admin/rules";
import { AUDIT_ACTION_LABEL, loadEmailConfirmedAt, type AuditLog } from "@/lib/admin/server";
import { isUuid } from "@/lib/api/handler";
import { formatDate, formatDateTimeFull } from "@/lib/format";
import { db } from "@/lib/supabase/admin";
import { loadInstructorProfile, requireAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "강사 상세" };

type RoomRow = { id: string; title: string; status: "active" | "ended"; join_code: string; created_at: string; starts_at: string | null; participants: { count: number }[] };

export default async function AdminInstructorDetailPage({ params }: PageProps<"/admin/instructors/[userId]">) {
  const { userId } = await params;
  const access = await requireAdmin(`/admin/instructors/${userId}`);
  if (!isUuid(userId)) notFound();
  const profile = await loadInstructorProfile(userId);
  if (!profile) notFound();

  const d = db();
  const [{ data: rooms }, { data: logs }, confirmedMap] = await Promise.all([
    d
      .from("rooms")
      .select("id, title, status, join_code, created_at, starts_at, participants!participants_room_id_fkey(count)")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .returns<RoomRow[]>(),
    d.from("admin_audit_logs").select("*").eq("target_type", "instructor").eq("target_id", userId).order("created_at", { ascending: false }).limit(50).returns<AuditLog[]>(),
    loadEmailConfirmedAt([userId]),
  ]);
  const emailConfirmedAt = confirmedMap.get(userId) ?? null;
  const roomList = rooms ?? [];

  // 최근 수업일: 방마다 수강생이 마지막으로 활동한 시각 (없으면 수업 일시·생성일)
  const lastActive = new Map<string, string>();
  const latestRows = await Promise.all(
    roomList.map((r) => d.from("participants").select("last_active_at").eq("room_id", r.id).order("last_active_at", { ascending: false }).limit(1).maybeSingle()),
  );
  roomList.forEach((r, i) => {
    const at = (latestRows[i]?.data as { last_active_at: string } | null)?.last_active_at;
    if (at) lastActive.set(r.id, at);
  });
  const lastClass = (r: RoomRow) => lastActive.get(r.id) ?? r.starts_at ?? r.created_at;
  const totalParticipants = roomList.reduce((n, r) => n + (r.participants?.[0]?.count ?? 0), 0);
  const latest = roomList.map(lastClass).sort().at(-1) ?? null;

  // 처리한 관리자 이메일 (reviewed_by에는 관리자 user_id가 들어 있어요. 'bootstrap'·'migration'은 그대로 보여요)
  const reviewerIds = [profile.reviewedBy, ...(logs ?? []).map((l) => l.actor_id)].filter((v): v is string => isUuid(v));
  const { data: reviewers } = reviewerIds.length ? await d.from("instructor_profiles").select("user_id, email").in("user_id", [...new Set(reviewerIds)]) : { data: [] };
  const reviewerEmail = new Map(((reviewers ?? []) as { user_id: string; email: string }[]).map((r) => [r.user_id, r.email]));

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href={`/admin/instructors?status=${profile.status}`}>
          <ArrowLeft aria-hidden /> 강사 목록
        </Link>
      </Button>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
            {profile.name || "(이름 없음)"}
            <Badge variant={profile.status === "approved" ? "success" : profile.status === "pending" ? "soft" : "coral-soft"}>{STATUS_LABEL[profile.status]}</Badge>
            {profile.isAdmin && (
              <Badge variant="soft">
                <ShieldCheck aria-hidden /> 관리자
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">{profile.email}</p>
        </div>
        <InstructorActions userId={profile.userId} name={profile.name || profile.email} status={profile.status} isAdmin={profile.isAdmin} isSelf={profile.userId === access.user.id} emailConfirmed={Boolean(emailConfirmedAt)} />
      </div>

      <dl className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "가입일", value: formatDate(profile.createdAt) },
          { label: "이메일 인증", value: emailConfirmedAt ? formatDate(emailConfirmedAt) : "인증 대기" },
          { label: "방", value: `${roomList.length}개` },
          { label: "누적 수강생", value: `${totalParticipants.toLocaleString("ko-KR")}명` },
          { label: "최근 수업일", value: latest ? formatDate(latest) : "-" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>
      {profile.statusReason && (
        <p className="mb-8 rounded-2xl bg-coral-soft px-4 py-3 text-sm">
          <strong>{profile.status === "rejected" ? "거절 사유" : "정지 사유"}</strong> · {profile.statusReason}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="rooms-title">
          <h2 id="rooms-title" className="mb-3 text-lg font-bold">
            보유 방
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">방</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">수강생</th>
                  <th className="px-4 py-3">최근 수업일</th>
                </tr>
              </thead>
              <tbody>
                {roomList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      아직 만든 방이 없어요.
                    </td>
                  </tr>
                )}
                {roomList.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold">{r.title}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{r.join_code}</span>
                    </td>
                    <td className="px-4 py-2.5">{r.status === "active" ? <Badge variant="soft">진행 중</Badge> : <Badge variant="secondary">종료</Badge>}</td>
                    <td className="px-4 py-2.5">{r.participants?.[0]?.count ?? 0}명</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(lastClass(r))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="history-title">
          <h2 id="history-title" className="mb-3 text-lg font-bold">
            승인 이력
          </h2>
          <ol className="space-y-2">
            {(logs ?? []).map((l) => (
              <li key={l.id} className="rounded-2xl border border-border bg-card p-3 text-sm shadow-soft">
                <p className="font-semibold">{AUDIT_ACTION_LABEL[l.action] ?? l.action}</p>
                {l.reason && <p className="mt-0.5 whitespace-pre-wrap">{l.reason}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTimeFull(l.created_at)} · {l.actor_email || (l.actor_id && reviewerEmail.get(l.actor_id)) || "알 수 없음"}
                </p>
              </li>
            ))}
            <li className="rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground">
              {formatDateTimeFull(profile.createdAt)} · 가입 신청
              {profile.reviewedBy && !isUuid(profile.reviewedBy) && <span className="block">최초 처리: {profile.reviewedBy === "bootstrap" ? "첫 관리자 지정(SQL)" : profile.reviewedBy === "migration" ? "기존 강사 일괄 승인" : profile.reviewedBy}</span>}
            </li>
          </ol>
        </section>
      </div>
    </>
  );
}
