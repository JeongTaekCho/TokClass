import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
        destructive: "bg-destructive text-white shadow-sm hover:bg-destructive/90",
        coral: "bg-coral text-white shadow-sm hover:bg-coral/90",
        outline: "border border-border bg-card text-foreground hover:bg-primary-soft hover:text-primary-hover",
        secondary: "bg-secondary text-secondary-foreground hover:bg-primary-soft",
        ghost: "text-foreground hover:bg-primary-soft hover:text-primary-hover",
        soft: "bg-primary-soft text-primary-hover hover:bg-primary-soft/70",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-[13px]",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "size-11",
        "icon-sm": "size-9 rounded-lg",
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
