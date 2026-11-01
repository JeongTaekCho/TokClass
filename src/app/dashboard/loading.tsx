import { LayoutTemplate } from "lucide-react";

import { IconChip } from "@/components/icon-chip";
import { TeacherDeskArt } from "@/components/illustrations";
import { TemplateList } from "@/components/instructor/template-list";
import { Skeleton } from "@/components/ui/skeleton";

/** 고정된 글·그림은 그대로 보여주고, 불러오는 데이터(이름·통계·방 목록)만 스켈레톤이에요. 헤더는 레이아웃에 있어요. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary-soft via-surface to-coral-soft shadow-card">
        <div className="grid items-center gap-4 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_240px]">
          <div>
            <Skeleton className="h-5 w-36 bg-surface/80" />
            <h1 className="mt-1 text-title sm:text-[1.75rem]">오늘은 어떤 수업을 열까요?</h1>
            <p className="mt-1 text-muted-foreground">방을 열고 참여코드를 공유하면 수업 준비 끝이에요.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2" aria-hidden>
              <Skeleton className="h-11 w-36 bg-surface/80" />
              <Skeleton className="h-9 w-28 rounded-full bg-surface/80" />
              <Skeleton className="h-9 w-32 rounded-full bg-surface/80" />
            </div>
          </div>
          <TeacherDeskArt className="mx-auto hidden max-w-60 md:block" />
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section role="status" aria-live="polite">
          <span className="sr-only">내 방을 불러오고 있어요</span>
          <div aria-hidden>
            <Skeleton className="mb-3 h-7 w-28" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[250px] rounded-lg" />
              ))}
            </div>
          </div>
        </section>
        <aside className="h-fit space-y-3 rounded-2xl border border-border/70 bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <IconChip icon={LayoutTemplate} tone="lilac" />
            <h2 className="text-heading">내 템플릿</h2>
          </div>
          <p className="text-sm text-muted-foreground">방 설정에서 [템플릿으로 저장]을 누르면 여기에 추가돼요.</p>
          <TemplateList templates={[]} />
        </aside>
      </div>
    </main>
  );
}
