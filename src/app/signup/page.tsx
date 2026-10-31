import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/instructor/auth-form";
import { AuthShell } from "@/components/instructor/auth-shell";
import { getInstructor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "강사 가입" };

export default async function SignupPage() {
  if (await getInstructor()) redirect("/dashboard");
  return (
    <AuthShell title="톡클 강사로 시작해요" description="가입 신청 후 관리자 승인을 받으면 방을 만들 수 있어요. 수강생은 가입이 필요 없어요.">
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
