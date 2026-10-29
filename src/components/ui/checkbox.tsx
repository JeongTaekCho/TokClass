"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * shadcn/ui Checkbox와 같은 API(checked, onCheckedChange)를 쓰는 네이티브 체크박스.
 * 네이티브 input이라 폼·스크린리더와 잘 맞고 hydration 차이가 생기지 않아요.
 */
function Checkbox({
  className,
  checked,
  onCheckedChange,
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "checked"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      checked={checked}
      onChange={(e) => {
        onChange?.(e);
        onCheckedChange?.(e.target.checked);
      }}
      className={cn(
        "peer size-5 shrink-0 cursor-pointer appearance-none rounded-md border-2 border-input bg-card bg-center bg-no-repeat shadow-xs transition outline-none",
        "checked:border-primary checked:bg-primary checked:bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E\")] checked:bg-[length:14px_14px]",
        "focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
