import { InstructorHeaderSkeleton } from "@/components/instructor/header-skeleton";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-dvh">
      <InstructorHeaderSkeleton />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <PageHeaderSkeleton />
        <div aria-hidden className="mb-4 flex flex-wrap gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="ml-auto h-10 w-72" />
        </div>
        <TableSkeleton columns={6} />
      </main>
    </div>
  );
}
