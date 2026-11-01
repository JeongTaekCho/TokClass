import { ResourceListSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <Skeleton className="h-8 w-24" />
      <ResourceListSkeleton rows={4} />
    </main>
  );
}
