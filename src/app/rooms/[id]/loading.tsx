import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";

// 참여자·조 편성·설정 화면 공통. 방 메뉴가 있는 헤더는 레이아웃이라 그대로 남아요.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PageHeaderSkeleton />
      <TableSkeleton columns={5} rows={6} />
    </main>
  );
}
