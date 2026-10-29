import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { JoinCodeForm } from "@/components/student/join-code-form";

export const metadata: Metadata = { title: "수업 참여" };

export default function JoinPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-10">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lifted sm:p-8">
        <h1 className="text-2xl font-extrabold">수업에 참여할게요</h1>
        <p className="mt-1 mb-6 text-muted-foreground">가입 없이 참여코드만 있으면 돼요.</p>
        <JoinCodeForm />
      </section>
    </main>
  );
}
