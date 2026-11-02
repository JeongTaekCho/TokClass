import { ScrollText } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <>
      <PageHeader icon={ScrollText} title="감사 로그" description="관리자가 한 모든 작업이 기록돼요. 기록은 지울 수 없어요." />
      <TableSkeleton columns={5} />
    </>
  );
}
