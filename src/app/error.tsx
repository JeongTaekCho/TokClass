"use client";

import { useEffect } from "react";

import { ErrorArt } from "@/components/illustrations";
import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] 화면 오류", error);
  }, [error]);
  return (
    <StatusScreen art={<ErrorArt />} title="잠시 문제가 생겼어요" actions={<Button onClick={reset}>다시 시도</Button>}>
      다시 시도해도 계속되면 새로고침해 주세요.
    </StatusScreen>
  );
}
