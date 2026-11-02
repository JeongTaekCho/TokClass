import { UserCheck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader icon={UserCheck} title="참여자 관리" description="부적절한 채팅은 진행 화면의 채팅에서 메시지별로 숨길 수 있어요." />
      <TableSkeleton columns={5} rows={6} />
    </main>
  );
}
