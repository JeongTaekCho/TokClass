"use client";

import { useEffect } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] 화면 오류", error);
  }, [error]);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo size="lg" />
      <h1 className="mt-6 text-2xl font-extrabold">잠시 문제가 생겼어요</h1>
      <p className="mt-2 text-muted-foreground">다시 시도해도 계속되면 새로고침해 주세요.</p>
      <Button className="mt-6" onClick={reset}>
        다시 시도
      </Button>
    </main>
  );
}
