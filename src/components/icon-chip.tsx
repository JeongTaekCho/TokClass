import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * 아이콘 칩: lucide 아이콘을 연한 색 둥근 사각형에 담아요. 목록 행·기능 소개·통계 앞에 붙여서 무엇인지 한눈에 보여 줘요.
 * 아이콘은 모두 lucide-react, 선 굵기 2, 칩 안에서는 칩 크기의 절반이에요.
 */
const TONES = {
  primary: "bg-primary-soft text-primary",
  coral: "bg-coral-soft text-coral-ink",
  sun: "bg-sun-soft text-warning",
  mint: "bg-mint-soft text-success",
  sky: "bg-sky-soft text-sky-ink",
  lilac: "bg-lilac-soft text-lilac-ink",
  muted: "bg-sunken text-muted-foreground",
} as const;

export type IconChipTone = keyof typeof TONES;

export function IconChip({ icon: Icon, tone = "primary", size = "md", className }: { icon: LucideIcon; tone?: IconChipTone; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        size === "sm" ? "size-7 rounded-[8px] [&_svg]:size-4" : size === "lg" ? "size-12 rounded-[14px] [&_svg]:size-6" : "size-9 rounded-[10px] [&_svg]:size-[18px]",
        TONES[tone],
        className,
      )}
    >
      <Icon strokeWidth={2} />
    </span>
  );
}
