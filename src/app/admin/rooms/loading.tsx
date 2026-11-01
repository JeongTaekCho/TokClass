import { TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <>
      <h1 className="mb-1 text-title">방 관리</h1>
      <p className="mb-6 text-muted-foreground">모든 강사의 방을 보고, 필요하면 강제로 종료하거나 삭제할 수 있어요.</p>
      <TableSkeleton columns={6} />
    </>
  );
}
