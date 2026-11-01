import { TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-title">조별 소그룹방</h1>
      <TableSkeleton columns={3} rows={4} />
    </main>
  );
}
