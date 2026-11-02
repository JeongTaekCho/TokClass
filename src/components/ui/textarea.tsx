import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full resize-none rounded-md border border-input bg-surface px-3.5 py-2.5 text-base transition-[color,box-shadow,border-color] shadow-[inset_0_1px_2px_rgb(49_46_129/0.05)] outline-none placeholder:text-muted-foreground/80 hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
