"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** 읽기 전용 화면은 실시간 연결 없이 15초마다 새로 받아와요 (방 채널 구독 권한이 없어서). */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
