import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { RoomActions } from "@/components/admin/room-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { blocksParticipants, type InstructorStatus } from "@/lib/admin/rules";
import { ilikeAny, searchTerm } from "@/lib/admin/search";
import { formatDate } from "@/lib/format";
import { db } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "방 관리" };

type RoomListRow = { id: string; owner_id: string; title: string; status: "active" | "ended"; join_code: string; created_at: string; participants: { count: number }[] };

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "active", label: "진행 중" },
  { key: "ended", label: "종료" },
] as const;

export default async function AdminRoomsPage({ searchParams }: PageProps<"/admin/rooms">) {
  await requireAdmin("/admin/rooms");
  const sp = await searchParams;
  const status = FILTERS.find((f) => f.key === sp.status)?.key ?? "all";
  const q = searchTerm(sp.q);
  const d = db();

  let query = d
    .from("rooms")
    .select("id, owner_id, title, status, join_code, created_at, participants!participants_room_id_fkey(count)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") query = query.eq("status", status);
  if (q) {
    // 방 제목·참여코드 또는 강사 이름·이메일로 찾아요.
    const { data: owners } = await d.from("instructor_profiles").select("user_id").or(ilikeAny(["name", "email"], q)).limit(100);
    const ownerIds = ((owners ?? []) as { user_id: string }[]).map((o) => o.user_id);
    const filters = [ilikeAny(["title"], q)];
    if (/^\d{1,6}$/.test(q)) filters.push(`join_code.like.${q}*`);
    if (ownerIds.length) filters.push(`owner_id.in.(${ownerIds.join(",")})`);
    query = query.or(filters.join(","));
  }
  const { data, error } = await query.returns<RoomListRow[]>();
  if (error) throw error;
  const rooms = data ?? [];

  const ownerIds = [...new Set(rooms.map((r) => r.owner_id))];
  const { data: profiles } = ownerIds.length ? await d.from("instructor_profiles").select("user_id, name, email, status").in("user_id", ownerIds) : { data: [] };
  const owners = new Map(((profiles ?? []) as { user_id: string; name: string; email: string; status: InstructorStatus }[]).map((p) => [p.user_id, p]));
  const href = (s: string) => `/admin/rooms?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">방 관리</h1>
          <p className="text-muted-foreground">모든 강사의 방을 보고, 필요하면 강제로 종료하거나 삭제할 수 있어요.</p>
        </div>
        <form className="relative w-full max-w-xs" action="/admin/rooms">
          <input type="hidden" name="status" value={status} />
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={q ?? ""} placeholder="방 제목·참여코드·강사 검색" aria-label="방 검색" className="pl-9" />
        </form>
      </div>
      <nav aria-label="상태" className="mb-4 flex gap-1">
        {FILTERS.map((f) => (
          <Button key={f.key} asChild size="sm" variant={f.key === status ? "soft" : "ghost"}>
            <Link href={href(f.key)} aria-current={f.key === status ? "page" : undefined}>
              {f.label}
            </Link>
          </Button>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">방</th>
              <th className="px-4 py-3">강사</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">참여자</th>
              <th className="px-4 py-3">생성일</th>
              <th className="px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {q ? `"${q}"에 맞는 방이 없어요.` : "방이 없어요."}
                </td>
              </tr>
            )}
            {rooms.map((r) => {
              const owner = owners.get(r.owner_id);
              return (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-semibold">{r.title}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{r.join_code}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {owner ? (
                      <Link href={`/admin/instructors/${r.owner_id}`} className="hover:text-primary hover:underline">
                        {owner.name || owner.email}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">알 수 없음</span>
                    )}
                    {blocksParticipants(owner?.status) && (
                      <Badge variant="coral-soft" className="ml-1.5">
                        입장 차단
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{r.status === "active" ? <Badge variant="soft">진행 중</Badge> : <Badge variant="secondary">종료</Badge>}</td>
                  <td className="px-4 py-2.5">{r.participants?.[0]?.count ?? 0}명</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <RoomActions roomId={r.id} title={r.title} status={r.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rooms.length === 200 && <p className="mt-2 text-sm text-muted-foreground">최근 200개까지만 보여요. 검색으로 좁혀 주세요.</p>}
    </>
  );
}
