import type { Metadata } from "next";
import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";

import { InstructorActions } from "@/components/admin/instructor-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INSTRUCTOR_STATUSES, STATUS_LABEL, isInstructorStatus, type InstructorStatus } from "@/lib/admin/rules";
import { ilikeAny, searchTerm } from "@/lib/admin/search";
import { loadEmailConfirmedAt } from "@/lib/admin/server";
import { formatDate } from "@/lib/format";
import { db } from "@/lib/supabase/admin";
import { PROFILE_SELECT, requireAdmin, toInstructorProfile } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "강사 관리" };

export default async function AdminInstructorsPage({ searchParams }: PageProps<"/admin/instructors">) {
  const access = await requireAdmin("/admin/instructors");
  const sp = await searchParams;
  const status: InstructorStatus = isInstructorStatus(sp.status) ? sp.status : "pending";
  const q = searchTerm(sp.q);

  const d = db();
  let query = d.from("instructor_profiles").select(PROFILE_SELECT).eq("status", status).order("created_at", { ascending: status === "pending" }) // 대기는 오래된 신청부터.limit(200);
  if (q) query = query.or(ilikeAny(["name", "email"], q));
  const [{ data, error }, ...counts] = await Promise.all([
    query,
    ...INSTRUCTOR_STATUSES.map((s) => d.from("instructor_profiles").select("user_id", { count: "exact", head: true }).eq("status", s)),
  ]);
  if (error) throw error;
  const profiles = (data ?? []).map(toInstructorProfile);

  const ids = profiles.map((p) => p.userId);
  const [{ data: roomRows }, confirmedAt] = await Promise.all([
    ids.length ? d.from("rooms").select("owner_id").in("owner_id", ids) : Promise.resolve({ data: [] }),
    loadEmailConfirmedAt(ids),
  ]);
  const roomCount = new Map<string, number>();
  for (const r of (roomRows ?? []) as { owner_id: string }[]) roomCount.set(r.owner_id, (roomCount.get(r.owner_id) ?? 0) + 1);

  const tabHref = (s: InstructorStatus) => `/admin/instructors?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">강사 관리</h1>
          <p className="text-muted-foreground">이메일 인증을 마친 가입 신청을 승인하거나, 문제가 있는 계정을 정지할 수 있어요.</p>
        </div>
        <form className="relative w-full max-w-xs" action="/admin/instructors">
          <input type="hidden" name="status" value={status} />
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={q ?? ""} placeholder="이름·이메일 검색" aria-label="이름·이메일 검색" className="pl-9" />
        </form>
      </div>

      <nav aria-label="상태" className="mb-4 flex flex-wrap gap-1">
        {INSTRUCTOR_STATUSES.map((s, i) => (
          <Button key={s} asChild size="sm" variant={s === status ? "soft" : "ghost"}>
            <Link href={tabHref(s)} aria-current={s === status ? "page" : undefined}>
              {STATUS_LABEL[s]}
              <span className={cn("rounded-full px-1.5 text-xs", s === "pending" && (counts[i]?.count ?? 0) > 0 ? "bg-coral text-white" : "bg-muted")}>{counts[i]?.count ?? 0}</span>
            </Link>
          </Button>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">이메일</th>
              <th className="px-4 py-3">이메일 인증</th>
              <th className="px-4 py-3">가입일</th>
              <th className="px-4 py-3">방</th>
              <th className="px-4 py-3">{status === "pending" ? "" : "처리일 · 사유"}</th>
              <th className="px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {q ? `"${q}"에 맞는 강사가 없어요.` : `${STATUS_LABEL[status]} 상태인 강사가 없어요.`}
                </td>
              </tr>
            )}
            {profiles.map((p) => (
              <tr key={p.userId} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5 font-semibold">
                  <Link href={`/admin/instructors/${p.userId}`} className="hover:text-primary hover:underline">
                    {p.name || "(이름 없음)"}
                  </Link>
                  {p.isAdmin && (
                    <Badge variant="soft" className="ml-1.5">
                      <ShieldCheck aria-hidden /> 관리자
                    </Badge>
                  )}
                  {p.userId === access.user.id && <span className="ml-1.5 text-xs text-muted-foreground">(나)</span>}
                </td>
                <td className="px-4 py-2.5 break-all">{p.email}</td>
                <td className="px-4 py-2.5">
                  {confirmedAt.get(p.userId) ? <Badge variant="success">인증 완료</Badge> : <Badge variant="secondary">인증 대기</Badge>}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(p.createdAt)}</td>
                <td className="px-4 py-2.5">{roomCount.get(p.userId) ?? 0}</td>
                <td className="max-w-[16rem] px-4 py-2.5 text-muted-foreground">
                  {status !== "pending" && (
                    <>
                      {formatDate(p.reviewedAt)}
                      {p.statusReason && <span className="block truncate" title={p.statusReason}>{p.statusReason}</span>}
                    </>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <InstructorActions userId={p.userId} name={p.name || p.email} status={p.status} isAdmin={p.isAdmin} isSelf={p.userId === access.user.id} emailConfirmed={Boolean(confirmedAt.get(p.userId))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {profiles.length === 200 && <p className="mt-2 text-sm text-muted-foreground">최근 200명까지만 보여요. 검색으로 좁혀 주세요.</p>}
    </>
  );
}
