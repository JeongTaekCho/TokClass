import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";

/** 헤더까지 페이지가 그리는 화면(대시보드, 수강생 관리)의 로딩 화면용 헤더. 실제 헤더와 높이가 같아요. */
export function InstructorHeaderSkeleton() {
  return (
    <header aria-hidden className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo href={null} size="sm" />
        <div className="flex-1" />
        <Skeleton className="hidden h-4 w-40 sm:block" />
        <Skeleton className="size-9" />
      </div>
    </header>
  );
}
