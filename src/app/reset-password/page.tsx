import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/instructor/auth-shell";
import { ResetForm } from "@/components/instructor/password-forms";
import { getInstructor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "새 비밀번호" };

export default async function ResetPasswordPage() {
  if (!(await getInstructor())) redirect("/forgot");
  return (
    <AuthShell title="새 비밀번호를 정해요" description="다음 로그인부터 새 비밀번호를 써요.">
      <ResetForm />
    </AuthShell>
  );
}
