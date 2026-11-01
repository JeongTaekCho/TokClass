import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center press gap-2 rounded-md text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // 칠한 버튼은 아래쪽에 얇은 그림자 띠가 있어서 눌러 볼 수 있는 물건처럼 보여요.
        default: "bg-primary text-primary-foreground shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-primary-hover hover:shadow-brand",
        destructive: "bg-destructive text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-destructive/90",
        // 코랄 위 글자는 잉크색이에요(흰 글자는 대비 2.8:1로 AA 미달)
        coral: "bg-coral text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)] hover:bg-coral-hover",
        outline: "border border-border bg-surface text-foreground shadow-card hover:border-border-strong hover:bg-sunken/50",
        secondary: "bg-sunken text-foreground hover:bg-border",
        ghost: "text-muted-foreground hover:bg-sunken hover:text-foreground",
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
