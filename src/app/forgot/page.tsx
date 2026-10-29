import type { Metadata } from "next";

import { AuthShell } from "@/components/instructor/auth-shell";
import { ForgotForm } from "@/components/instructor/password-forms";

export const metadata: Metadata = { title: "비밀번호 찾기" };

export default function ForgotPage() {
  return (
    <AuthShell title="비밀번호를 잊으셨나요?" description="가입한 이메일로 재설정 링크를 보내 드릴게요.">
      <ForgotForm />
    </AuthShell>
  );
}
