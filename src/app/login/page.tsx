import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/instructor/auth-form";
import { AuthShell } from "@/components/instructor/auth-shell";
import { getInstructor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "강사 로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const linkError = sp.error === "link";
  if (await getInstructor()) redirect(next && next.startsWith("/") ? next : "/dashboard");
  return (
    <AuthShell title="다시 만나서 반가워요" description="강사 계정으로 로그인해 주세요.">
      {linkError && <p className="mb-4 rounded-xl bg-coral-soft px-3 py-2 text-sm">링크가 만료됐거나 이미 사용됐어요. 다시 로그인하거나 새 링크를 받아 주세요.</p>}
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
