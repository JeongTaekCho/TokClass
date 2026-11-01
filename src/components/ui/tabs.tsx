"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { ActiveIndicator } from "@/components/motion";
import { cn } from "@/lib/utils";

/*
 * 세그먼트 탭: 회색 홈 안에서 흰 알약(현재 탭)이 미끄러지듯 옮겨 가요.
 * 현재 값을 알아야 알약을 그릴 수 있어서 Root가 값을 컨텍스트로 내려줘요(제어·비제어 모두 지원).
 */
const TabsContext = React.createContext<{ value: string | undefined; id: string }>({ value: undefined, id: "" });

function Tabs({ className, value, defaultValue, onValueChange, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const id = React.useId();
  const [inner, setInner] = React.useState(defaultValue);
  const current = value ?? inner;
  return (
    <TabsContext.Provider value={{ value: current, id }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-3", className)}
        value={current}
        onValueChange={(v) => {
          setInner(v);
          onValueChange?.(v);
        }}
        {...props}
      />
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("inline-flex w-fit items-center gap-0.5 rounded-md bg-sunken p-1 text-muted-foreground", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, children, value, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const ctx = React.useContext(TabsContext);
  const active = ctx.value === value;
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative isolate inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:font-semibold data-[state=active]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {active && <ActiveIndicator layoutId={`tabs-${ctx.id}`} className="absolute inset-0 -z-10 rounded-[8px] bg-surface shadow-card" />}
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none data-[state=active]:animate-enter-up", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
