import { FadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";

/** 목록·패널 안의 빈 상태: 컬러 일러스트 + 제목 + 한두 줄 안내. 들어올 때 살짝 떠올라요. */
export function EmptyState({ art, title, children, className }: { art?: React.ReactNode; title?: string; children?: React.ReactNode; className?: string }) {
  return (
    <FadeIn className={cn("mx-auto flex max-w-xs flex-col items-center py-8 text-center", className)}>
      {art && <div className="mb-4 w-full max-w-48">{art}</div>}
      {title && <p className="font-semibold text-foreground">{title}</p>}
      {children && <div className={cn("text-sm text-muted-foreground", title && "mt-1")}>{children}</div>}
    </FadeIn>
  );
}
