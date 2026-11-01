import { ReportSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-title">수업 리포트</h1>
      <Skeleton className="mt-1 mb-6 h-5 w-48" />
      <ReportSkeleton />
    </main>
  );
}
