import { Logo } from "@/components/brand/logo";
import { FadeIn } from "@/components/motion";
import { cn } from "@/lib/utils";

/** 한 화면 전체를 쓰는 안내(404, 오류, 수업 없음, 세션 끊김 등). 그림 → 제목 → 설명 → 행동 순서예요. */
export function StatusScreen({
  art,
  title,
  titleId,
  children,
  actions,
  logo = true,
  className,
}: {
  art: React.ReactNode;
  title: string;
  titleId?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  logo?: boolean;
  className?: string;
}) {
  return (
    <main className={cn("flex min-h-dvh flex-col items-center bg-dots px-4 py-8 text-center", className)}>
      {logo && <Logo size="sm" className="self-start sm:self-center" />}
      <FadeIn className="flex w-full max-w-sm flex-1 flex-col items-center justify-center py-8">
        <div className="w-full max-w-72">{art}</div>
        <h1 id={titleId} className="mt-6 text-title">
          {title}
        </h1>
        {children && <div className="mt-2 text-muted-foreground">{children}</div>}
        {actions && <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">{actions}</div>}
      </FadeIn>
    </main>
  );
}
