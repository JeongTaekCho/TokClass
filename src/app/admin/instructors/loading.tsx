import { TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <>
      <h1 className="mb-1 text-title">강사 관리</h1>
      <p className="mb-6 text-muted-foreground">이메일 인증을 마친 가입 신청을 승인하거나, 문제가 있는 계정을 정지할 수 있어요.</p>
      <TableSkeleton columns={6} />
    </>
  );
}
