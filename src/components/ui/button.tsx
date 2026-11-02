import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center press gap-2 rounded-md text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,translate,filter] duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // 칠한 버튼: 인디고→바이올렛 그라데이션 + 위쪽 빛 반사 + 아래쪽 그림자 띠. 올리면 살짝 떠오르며 빛나요.
        default:
          "bg-brand text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.22),inset_0_-2px_0_rgb(0_0_0/0.16)] hover:-translate-y-px hover:brightness-110 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.22),inset_0_-2px_0_rgb(0_0_0/0.16),var(--shadow-brand)] active:translate-y-0",
        destructive: "bg-destructive text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-destructive/90",
        // 코랄 위 글자는 잉크색이에요(흰 글자는 대비 2.8:1로 AA 미달)
        coral: "bg-coral text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.3),inset_0_-2px_0_rgb(0_0_0/0.12)] hover:-translate-y-px hover:bg-coral-hover hover:shadow-[inset_0_-2px_0_rgb(0_0_0/0.12),0_8px_20px_-8px_rgb(255_107_74/0.6)]",
        outline: "border border-border bg-surface text-foreground shadow-card hover:border-primary/30 hover:bg-primary-soft/40 hover:text-primary-ink",
        secondary: "bg-sunken text-foreground hover:bg-border",
        ghost: "text-muted-foreground hover:bg-primary-soft/60 hover:text-primary-ink",
        soft: "bg-primary-soft text-primary-ink hover:bg-primary/15",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-12 px-6 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
