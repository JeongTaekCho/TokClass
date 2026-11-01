import { TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-title">참여자 관리</h1>
      <p className="mb-6 text-muted-foreground">부적절한 채팅은 진행 화면의 채팅에서 메시지별로 숨길 수 있어요.</p>
      <TableSkeleton columns={5} rows={6} />
    </main>
  );
}
