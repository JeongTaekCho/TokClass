import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";

// 관리자 레이아웃(헤더·메뉴)은 그대로 두고 본문만 바뀌어요.
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <TableSkeleton columns={5} />
    </>
  );
}
