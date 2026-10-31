import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AUDIT_ACTION_LABEL, type AuditLog } from "@/lib/admin/server";
import { formatDateTimeFull } from "@/lib/format";
import { db } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "감사 로그" };

const PAGE_SIZE = 50;

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin("/admin/audit");
  const sp = await searchParams;
  const page = Math.max(1, Math.min(1000, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1));
  const from = (page - 1) * PAGE_SIZE;

  const { data, count, error } = await db()
    .from("admin_audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
    .returns<AuditLog[]>();
  if (error) throw error;
  const logs = data ?? [];
  const total = count ?? 0;

  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold">감사 로그</h1>
      <p className="mb-6 text-muted-foreground">관리자가 한 모든 작업이 기록돼요. 기록은 지울 수 없어요.</p>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">언제</th>
              <th className="px-4 py-3">누가</th>
              <th className="px-4 py-3">무엇을</th>
              <th className="px-4 py-3">대상</th>
              <th className="px-4 py-3">사유</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  아직 기록이 없어요.
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-border/60 align-top last:border-0">
                <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{formatDateTimeFull(l.created_at)}</td>
                <td className="px-4 py-2.5 break-all">{l.actor_email || "알 수 없음"}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={l.action === "room.delete" || l.action === "instructor.suspend" || l.action === "instructor.reject" ? "coral-soft" : "soft"}>{AUDIT_ACTION_LABEL[l.action] ?? l.action}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  {l.target_type === "instructor" ? (
                    <Link href={`/admin/instructors/${l.target_id}`} className="hover:text-primary hover:underline">
                      {l.target_label || l.target_id}
                    </Link>
                  ) : (
                    <span>
                      {l.target_label || l.target_id}
                      <span className="ml-1 text-xs text-muted-foreground">(방)</span>
                    </span>
                  )}
                </td>
                <td className="max-w-[20rem] px-4 py-2.5 whitespace-pre-wrap">{l.reason ?? <span className="text-muted-foreground">-</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          전체 {total.toLocaleString("ko-KR")}건 · {page}쪽
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/audit?page=${page - 1}`}>이전</Link>
            </Button>
          )}
          {from + logs.length < total && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/audit?page=${page + 1}`}>다음</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
