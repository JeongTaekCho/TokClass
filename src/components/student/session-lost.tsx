"use client";

import Link from "next/link";
import { Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SessionLostReason } from "@/lib/realtime/provider";

const MESSAGES: Record<SessionLostReason, { title: string; body: string }> = {
  replaced: { title: "다른 기기에서 들어왔어요", body: "같은 비밀번호로 다른 기기에서 입장해서 이 기기의 연결을 끊었어요." },
  kicked: { title: "수업에서 나가게 됐어요", body: "강사님이 이 수업에서 내보냈어요. 궁금한 점은 강사님께 문의해 주세요." },
  reissued: { title: "비밀번호가 새로 발급됐어요", body: "강사님이 비밀번호를 새로 발급했어요. 새 비밀번호로 다시 들어와 주세요." },
  expired: { title: "연결이 끊겼어요", body: "세션이 만료됐어요. 비밀번호로 다시 들어와 주세요." },
};

export function SessionLost({ reason, code }: { reason: SessionLostReason; code: string }) {
  const m = MESSAGES[reason];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-6 backdrop-blur" role="alertdialog" aria-labelledby="lost-title">
      <div className="max-w-sm text-center">
        <Unplug className="mx-auto size-12 text-coral" aria-hidden />
        <h2 id="lost-title" className="mt-4 text-xl font-extrabold">
          {m.title}
        </h2>
        <p className="mt-2 text-muted-foreground">{m.body}</p>
        {reason !== "kicked" && (
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href={`/join/${code}`}>다시 들어가기</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
