import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 페이지 머리말: 브랜드 그라데이션 아이콘 칩 + 제목 + 설명 (+ 오른쪽 행동).
 * 강사·관리자 화면의 첫 줄을 모두 같은 모양으로 맞춰요. 서버·클라이언트 컴포넌트 어디서나 써요.
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  className,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-4">
        <span aria-hidden className="bg-brand inline-flex size-12 shrink-0 items-center justify-center rounded-[14px] text-white shadow-brand ring-4 ring-primary-soft/70">
          <Icon className="size-6" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h1 className="text-title">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
    </div>
  );
}
