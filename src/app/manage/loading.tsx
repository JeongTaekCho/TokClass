import { TableSkeleton } from "@/components/skeletons";

/** 제목·설명은 그대로, 수강생 표만 스켈레톤이에요. 헤더는 레이아웃에 있어요. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-title">수강생 관리</h1>
      <p className="mb-6 text-muted-foreground">내 방의 수강생을 한곳에서 찾고, 비밀번호 재발급·강퇴·조 이동을 할 수 있어요.</p>
      <TableSkeleton columns={6} />
    </main>
  );
}
