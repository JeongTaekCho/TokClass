import { UserCog } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <>
      <PageHeader icon={UserCog} title="강사 관리" description="이메일 인증을 마친 가입 신청을 승인하거나, 문제가 있는 계정을 정지할 수 있어요." />
      <TableSkeleton columns={6} />
    </>
  );
}
