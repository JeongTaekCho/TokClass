import { InstructorHeaderSkeleton } from "@/components/instructor/header-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-dvh">
      <InstructorHeaderSkeleton />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6" role="status">
        <span className="sr-only">내 방을 불러오고 있어요</span>
        <div aria-hidden>
          <Skeleton className="h-[188px] w-full rounded-2xl" />
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <Skeleton className="mb-3 h-6 w-28" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-[250px] rounded-lg" />
                ))}
              </div>
            </div>
            <Skeleton className="hidden h-64 rounded-2xl lg:block" />
          </div>
        </div>
      </main>
    </div>
  );
}
