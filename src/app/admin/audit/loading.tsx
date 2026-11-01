import { TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <>
      <h1 className="mb-1 text-title">감사 로그</h1>
      <p className="mb-6 text-muted-foreground">관리자가 한 모든 작업이 기록돼요. 기록은 지울 수 없어요.</p>
      <TableSkeleton columns={5} />
    </>
  );
}
