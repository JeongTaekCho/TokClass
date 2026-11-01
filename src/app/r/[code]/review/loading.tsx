import { ResourceListSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <h1 className="text-title">복습</h1>
      <ResourceListSkeleton rows={4} />
    </main>
  );
}
