import type { Metadata } from "next";
import { BookMarked } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { LessonLibrary } from "@/components/lessons/lesson-library";
import { requireAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "공용 교안" };

/** 공용 교안 관리 (관리자): 게시한 묶음만 강사에게 보여요. 모든 작업은 감사 로그에 남아요. */
export default async function AdminLessonsPage() {
  await requireAdmin("/admin/lessons");
  return (
    <>
      <PageHeader icon={BookMarked} title="공용 교안" description="모든 강사가 가져다 쓰는 교안 묶음이에요. 게시한 묶음만 강사에게 보여요." />
      <LessonLibrary mode="admin" />
    </>
  );
}
