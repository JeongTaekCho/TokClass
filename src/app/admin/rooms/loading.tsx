import { School } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <>
      <PageHeader icon={School} title="방 관리" description="모든 강사의 방을 보고, 필요하면 강제로 종료하거나 삭제할 수 있어요." />
      <TableSkeleton columns={6} />
    </>
  );
}
