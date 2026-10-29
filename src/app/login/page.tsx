import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/instructor/auth-form";
import { AuthShell } from "@/components/instructor/auth-shell";
import { getInstructor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "강사 로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  if (await getInstructor()) redirect(next && next.startsWith("/") ? next : "/dashboard");
  return (
    <AuthShell title="다시 만나서 반가워요" description="강사 계정으로 로그인해 주세요.">
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
