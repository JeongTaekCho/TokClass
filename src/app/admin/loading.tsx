import { GraduationCap, MonitorPlay, ShieldCheck, UserCheck, Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { IconChip } from "@/components/icon-chip";
import { Skeleton } from "@/components/ui/skeleton";

const STATS = [
  { icon: UserCheck, tone: "coral" as const, label: "승인 대기 강사" },
  { icon: GraduationCap, tone: "primary" as const, label: "전체 강사" },
  { icon: MonitorPlay, tone: "mint" as const, label: "진행 중인 방" },
  { icon: Users, tone: "sun" as const, label: "오늘 참여한 수강생" },
];

/** 관리자 개요: 카드 모양·이름은 그대로, 숫자만 스켈레톤이에요. (하위 화면은 각자 loading.tsx가 있어요) */
export default function Loading() {
  return (
    <>
      <PageHeader icon={ShieldCheck} title="관리자" description="강사 승인, 방 관리, 작업 기록을 한곳에서 볼 수 있어요." />
      <div role="status" aria-live="polite" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <span className="sr-only">현황을 불러오고 있어요</span>
        {STATS.map((st) => (
          <div key={st.label} aria-hidden className="flex h-full flex-col rounded-lg border border-border/70 bg-surface p-5 shadow-card">
            <IconChip icon={st.icon} tone={st.tone} />
            <span className="mt-4 text-sm text-muted-foreground">{st.label}</span>
            <Skeleton className="mt-1.5 h-7 w-16" />
          </div>
        ))}
      </div>
    </>
  );
}
