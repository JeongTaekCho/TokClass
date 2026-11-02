import { BarChart3 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ReportSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader icon={BarChart3} title="수업 리포트" description={<Skeleton className="mt-1 h-5 w-48" />} />
      <ReportSkeleton />
    </main>
  );
}
