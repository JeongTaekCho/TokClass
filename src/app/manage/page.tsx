import type { Metadata } from "next";

import { InstructorHeader } from "@/components/instructor/instructor-header";
import { ManageApp } from "@/components/instructor/manage/manage-app";
import { instructorDisplayName, requireApprovedInstructor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "수강생 관리" };

/** 강사용 수강생 관리: 본인 방의 수강생을 방을 넘나들며 관리해요. 방별 화면(/rooms/[id]/participants)도 그대로 있어요. */
export default async function ManagePage() {
  const access = await requireApprovedInstructor("/manage");
  return (
    <div className="min-h-dvh">
      <InstructorHeader name={instructorDisplayName(access)} isAdmin={access.profile.isAdmin} />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-2xl font-extrabold">수강생 관리</h1>
        <p className="mb-6 text-muted-foreground">내 방의 수강생을 한곳에서 찾고, 비밀번호 재발급·강퇴·조 이동을 할 수 있어요.</p>
        <ManageApp />
      </main>
    </div>
  );
}
