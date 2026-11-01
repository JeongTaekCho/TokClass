import { Skeleton } from "@/components/ui/skeleton";

/** 설정 값은 방마다 달라서 폼 자리만 스켈레톤이에요. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-title">방 설정</h1>
      <div role="status" aria-live="polite">
        <span className="sr-only">설정을 불러오고 있어요</span>
        <div aria-hidden className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  );
}
