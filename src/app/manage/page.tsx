import type { Metadata } from "next";
import { Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ManageApp } from "@/components/instructor/manage/manage-app";
import { requireApprovedInstructor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "수강생 관리" };

/** 강사용 수강생 관리: 본인 방의 수강생을 방을 넘나들며 관리해요. 방별 화면(/rooms/[id]/participants)도 그대로 있어요. */
export default async function ManagePage() {
  await requireApprovedInstructor("/manage");
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <PageHeader icon={Users} title="수강생 관리" description="내 방의 수강생을 한곳에서 찾고, 비밀번호 재발급·강퇴·조 이동을 할 수 있어요." />
        <ManageApp />
    </main>
  );
}
