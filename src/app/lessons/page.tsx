import type { Metadata } from "next";

import { LessonLibrary } from "@/components/lessons/lesson-library";
import { requireApprovedInstructor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "교안" };

/** 내 교안 라이브러리: 수업 중에 반복해서 여는 링크와 복사해 쓰는 프롬프트를 묶음으로 모아 두고, 방마다 가져다 써요. */
export default async function LessonsPage() {
  await requireApprovedInstructor("/lessons");
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-title">교안</h1>
        <p className="text-muted-foreground">자주 여는 링크와 복사해 쓰는 프롬프트·명령어를 묶음으로 모아 두세요. 방의 교안 탭에서 [라이브러리에서 가져오기]로 넣을 수 있어요.</p>
      </div>
      <LessonLibrary mode="instructor" />
    </main>
  );
}
