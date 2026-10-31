import type { Metadata } from "next";

import { AdminNav } from "@/components/admin/admin-nav";
import { InstructorHeader } from "@/components/instructor/instructor-header";
import { db } from "@/lib/supabase/admin";
import { instructorDisplayName, requireAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { template: "%s · 관리자", default: "관리자" }, robots: { index: false, follow: false } };

/** 관리자 화면 공통. 레이아웃은 화면 이동 때 다시 실행되지 않으므로, 각 페이지에서도 requireAdmin()을 다시 확인해요. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const access = await requireAdmin();
  const { count } = await db().from("instructor_profiles").select("user_id", { count: "exact", head: true }).eq("status", "pending");
  return (
    <div className="flex min-h-dvh flex-col">
      <InstructorHeader name={instructorDisplayName(access)} isAdmin>
        <AdminNav pendingCount={count ?? 0} />
      </InstructorHeader>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
