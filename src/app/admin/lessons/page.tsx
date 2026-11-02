import type { Metadata } from "next";

import { LessonLibrary } from "@/components/lessons/lesson-library";
import { requireAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "공용 교안" };

/** 공용 교안 관리 (관리자): 게시한 묶음만 강사에게 보여요. 모든 작업은 감사 로그에 남아요. */
export default async function AdminLessonsPage() {
  await requireAdmin("/admin/lessons");
  return (
    <>
      <div className="mb-6">
        <h1 className="text-title">공용 교안</h1>
        <p className="text-muted-foreground">모든 강사가 가져다 쓰는 교안 묶음이에요. 게시한 묶음만 강사에게 보여요.</p>
      </div>
      <LessonLibrary mode="admin" />
    </>
  );
}
