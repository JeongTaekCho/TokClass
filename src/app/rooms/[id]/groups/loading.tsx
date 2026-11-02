import { Shapes } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader icon={Shapes} title="조별 소그룹방" description="조를 나누면 조마다 채팅과 산출물 공간이 생겨요." />
      <TableSkeleton columns={3} rows={4} />
    </main>
  );
}
