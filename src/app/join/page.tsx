import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { JoinPhoneArt } from "@/components/illustrations";
import { FadeIn } from "@/components/motion";
import { JoinCodeForm } from "@/components/student/join-code-form";

export const metadata: Metadata = { title: "수업 참여" };

export default function JoinPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-dots px-4 py-6 sm:items-center sm:py-12">
      <Logo size="sm" />
      <FadeIn className="ring-brand mt-6 w-full max-w-md rounded-2xl bg-surface p-5 shadow-glow sm:mt-10 sm:p-7">
        <JoinPhoneArt className="mx-auto mb-2 max-w-52" />
        <h1 className="text-title">수업에 참여할게요</h1>
        <p className="mt-1 mb-6 text-muted-foreground">가입 없이 참여코드만 있으면 돼요.</p>
        <JoinCodeForm />
      </FadeIn>
    </main>
  );
}
